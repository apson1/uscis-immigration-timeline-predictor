import os
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Import our custom clients and modules
from uscis_client import USCISClient
from batch_analytics import run_survival_analysis, parse_date

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI App
app = FastAPI(title="Immigration Timeline Predictor API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Initialize USCIS Sandbox Client
uscis = USCISClient()

class CaseSyncRequest(BaseModel):
    receipt_number: str
    user_id: str
    form_type: str        # User provides, or retrieved from API
    service_center: str   # User provides, or retrieved from API
    filed_date: str       # YYYY-MM-DD

@app.get("/")
def read_root():
    return {"message": "Welcome to the Crowdsourced Immigration Timeline Predictor API"}

@app.get("/api/predictions")
async def get_predictions(
    form_type: str = Query(..., description="Visa Form Type (e.g. I-485, I-130)"),
    service_center: str = Query(..., description="Service Center / Processing Location")
):
    """Fetches the cached survival analysis percentiles and curve coordinates for a specific visa category."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    try:
        response = supabase.table("predictions_summary")\
            .select("*")\
            .eq("form_type", form_type)\
            .eq("service_center", service_center)\
            .execute()
            
        if not response.data:
            return {
                "message": "Insufficient crowdsourced data to estimate predictions for this category yet.",
                "form_type": form_type,
                "service_center": service_center,
                "has_data": False
            }
            
        return {
            "has_data": True,
            **response.data[0]
        }
    except Exception as e:
        logger.error(f"Error fetching predictions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error retrieving predictions.")

@app.post("/api/cases/sync")
async def sync_case(request: CaseSyncRequest):
    """
    Syncs a case status with the USCIS Sandbox API.
    Updates the database with the case status and milestone dates.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")

    receipt_num = request.receipt_number.strip()
    user_id = request.user_id
    
    # 1. Fetch case status from USCIS Sandbox API
    uscis_data = await uscis.fetch_case_status(receipt_num)
    
    if "error" in uscis_data:
        # If API lookup fails, we write it as a manual input or error out
        logger.warning(f"USCIS API lookup failed for {receipt_num}: {uscis_data['error']}")
        # For development ease, if client credentials are mock/missing, we'll allow testing
        # with mock data by raising an error to prompt the user
        raise HTTPException(
            status_code=400, 
            detail=f"USCIS Sandbox check failed: {uscis_data['error']}. Verify credentials or receipt number."
        )

    # Sandbox API returns values like: formType, submittedDate, modifiedDate, current_case_status_text_en
    # Ensure they map properly
    form_type = uscis_data.get("formType", request.form_type)
    status_text = uscis_data.get("current_case_status_text_en", "Case Was Received")
    submitted_date_str = uscis_data.get("submittedDate", request.filed_date)
    modified_date_str = uscis_data.get("modifiedDate")

    submitted_date = parse_date(submitted_date_str)
    modified_date = parse_date(modified_date_str)

    # Determine milestones and completion status
    status_lower = status_text.lower()
    is_completed = "approved" in status_lower or "denied" in status_lower
    completed_date = modified_date if is_completed else None

    # 2. Upsert Case to Supabase
    case_record = {
        "user_id": user_id,
        "form_type": form_type,
        "receipt_number": receipt_num,
        "service_center": request.service_center,
        "filed_date": str(submitted_date or request.filed_date),
        "current_status": status_text,
        "last_sync_date": "now()",
        "completed_date": str(completed_date) if completed_date else None
    }

    try:
        case_response = supabase.table("cases").upsert(
            case_record,
            on_conflict="receipt_number"
        ).execute()

        if not case_response.data:
            raise HTTPException(status_code=500, detail="Failed to write case to database.")

        case_id = case_response.data[0]["id"]

        # 3. Create milestones
        # Milestone A: RECEIVED (created when filed)
        supabase.table("milestones").upsert({
            "case_id": case_id,
            "milestone_type": "RECEIVED",
            "event_date": str(submitted_date or request.filed_date)
        }, on_conflict="case_id,milestone_type").execute()

        # Milestone B: CURRENT status update
        if is_completed:
            milestone_type = "APPROVED" if "approved" in status_lower else "DENIED"
            supabase.table("milestones").upsert({
                "case_id": case_id,
                "milestone_type": milestone_type,
                "event_date": str(completed_date)
            }, on_conflict="case_id,milestone_type").execute()
        elif "rfe" in status_lower:
            supabase.table("milestones").upsert({
                "case_id": case_id,
                "milestone_type": "RFE_SENT",
                "event_date": str(modified_date or "now()")
            }, on_conflict="case_id,milestone_type").execute()
        elif "biometrics" in status_lower:
            supabase.table("milestones").upsert({
                "case_id": case_id,
                "milestone_type": "BIOMETRICS",
                "event_date": str(modified_date or "now()")
            }, on_conflict="case_id,milestone_type").execute()

        # Return updated case info
        return {
            "success": True,
            "case": case_response.data[0]
        }

    except Exception as e:
        logger.error(f"Error writing to database: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/analytics/trigger")
async def trigger_analytics(background_tasks: BackgroundTasks):
    """Triggers the batch calculation process as a background task."""
    background_tasks.add_task(run_survival_analysis)
    return {"message": "Batch survival analysis triggered in the background."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
