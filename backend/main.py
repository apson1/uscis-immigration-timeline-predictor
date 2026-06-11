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

@app.get("/api/cases")
async def get_cases(user_id: str = Query(..., description="User ID to fetch cases for")):
    """Fetches all tracked cases for a specific user, including their milestones."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    try:
        response = supabase.table("cases")\
            .select("*, milestones(*)")\
            .eq("user_id", user_id)\
            .execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching cases: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

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
    # nested within the "case_status" key. Ensure they map properly.
    case_status_data = uscis_data.get("case_status", {})
    form_type = case_status_data.get("formType", request.form_type)
    status_text = case_status_data.get("current_case_status_text_en", "Case Was Received")
    submitted_date_str = case_status_data.get("submittedDate", request.filed_date)
    modified_date_str = case_status_data.get("modifiedDate")

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

        # Fetch the complete case with milestones
        full_case_response = supabase.table("cases")\
            .select("*, milestones(*)")\
            .eq("id", case_id)\
            .execute()

        if not full_case_response.data:
            raise HTTPException(status_code=500, detail="Failed to retrieve complete case data.")

        # Return updated case info
        return {
            "success": True,
            "case": full_case_response.data[0]
        }

    except Exception as e:
        logger.error(f"Error writing to database: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

class DetailedImportRequest(BaseModel):
    user_id: str
    service_center: str
    payload: dict

@app.post("/api/cases/import-detailed")
async def import_detailed_case(request: DetailedImportRequest):
    """
    Imports a raw JSON payload extracted from my.uscis.gov internal API.
    """
    from datetime import date
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    payload = request.payload
    if "data" in payload:
        payload = payload["data"]
        
    # Heuristics to extract data from various USCIS JSON shapes
    receipt_num = payload.get("receiptNumber") or payload.get("receipt_number")
    if not receipt_num:
        raise HTTPException(status_code=400, detail="Could not find a receipt number in the JSON.")
        
    form_type = payload.get("formType") or payload.get("form_type") or "Unknown"
    
    # Sometimes it's nested in caseStatus
    case_status_obj = payload.get("caseStatus", {}) if isinstance(payload.get("caseStatus"), dict) else {}
    status_text = case_status_obj.get("statusText") or payload.get("current_case_status_text_en") or payload.get("status")
    
    submitted_date_str = payload.get("submissionDate") or payload.get("submittedDate") or payload.get("receiptDate")
    submitted_date = parse_date(submitted_date_str) if submitted_date_str else None
    
    # Extract detailed milestones
    milestones_to_save = {}
    
    # 1. RECEIVED
    if submitted_date:
        milestones_to_save["RECEIVED"] = submitted_date
        
    # 2. evidenceRequests
    evidence_reqs = payload.get("evidenceRequests") or []
    if isinstance(evidence_reqs, list):
        for req in evidence_reqs:
            action_type = req.get("actionType")
            if action_type in ("Request for Evidence", "Request for Additional Evidence"):
                sent_date_str = req.get("generationDate") or req.get("createdAt")
                sent_date = parse_date(sent_date_str)
                if sent_date:
                    milestones_to_save["RFE_SENT"] = sent_date
                    
            response_date_str = req.get("latestResponseDate")
            is_responded = req.get("isRespondedTo") or (req.get("responseCount", 0) > 0)
            if response_date_str or is_responded:
                resp_date = parse_date(response_date_str) if response_date_str else None
                if resp_date:
                    milestones_to_save["RFE_RESPONSE"] = resp_date
                    
    # 3. notices
    notices = payload.get("notices") or []
    if isinstance(notices, list):
        for notice in notices:
            action_type = notice.get("actionType")
            if action_type == "Appointment Scheduled":
                appt_date_str = notice.get("appointmentDateTime") or notice.get("generationDate")
                appt_date = parse_date(appt_date_str)
                if appt_date:
                    milestones_to_save["BIOMETRICS"] = appt_date
                    
    # 4. events
    events = payload.get("events") or []
    if isinstance(events, list):
        for event in events:
            code = event.get("eventCode")
            evt_date_str = event.get("eventDateTime") or event.get("createdAt")
            evt_date = parse_date(evt_date_str)
            if evt_date:
                if code in ("FTA0", "IKA"):
                    milestones_to_save["BIOMETRICS"] = evt_date
                elif code == "HA":
                    milestones_to_save["RFE_RESPONSE"] = evt_date
                elif code in ("APPROVED", "APPR", "Approved", "Card Was Produced", "Case Approved"):
                    milestones_to_save["APPROVED"] = evt_date
                elif code in ("DENIED", "DENY", "Denied"):
                    milestones_to_save["DENIED"] = evt_date
                    
    # Scan standard history if present
    history = payload.get("caseHistory") or payload.get("caseActions") or payload.get("history") or []
    if history and isinstance(history, list):
        for item in history:
            action_date = item.get("date") or item.get("actionDate")
            action_desc = item.get("description") or item.get("action") or item.get("statusText")
            if action_date and action_desc:
                parsed_action_date = parse_date(action_date)
                if parsed_action_date:
                    desc_lower = action_desc.lower()
                    if "fingerprint" in desc_lower or "biometrics" in desc_lower:
                        milestones_to_save["BIOMETRICS"] = parsed_action_date
                    elif "rfe" in desc_lower or "request for evidence" in desc_lower:
                        if "received" in desc_lower or "response" in desc_lower:
                            milestones_to_save["RFE_RESPONSE"] = parsed_action_date
                        else:
                            milestones_to_save["RFE_SENT"] = parsed_action_date
                    elif "approve" in desc_lower:
                        milestones_to_save["APPROVED"] = parsed_action_date
                    elif "deny" in desc_lower or "reject" in desc_lower:
                        milestones_to_save["DENIED"] = parsed_action_date
                    else:
                        milestones_to_save[action_desc[:50]] = parsed_action_date

    # Fallback to RECEIVED if not present
    if "RECEIVED" not in milestones_to_save:
        milestones_to_save["RECEIVED"] = submitted_date or date.today()

    # Deduce current status
    if not status_text or status_text == "Unknown":
        status_text = "Case Was Received"
        if "APPROVED" in milestones_to_save:
            status_text = "Case Was Approved"
        elif "DENIED" in milestones_to_save:
            status_text = "Case Was Denied"
        elif "RFE_RESPONSE" in milestones_to_save:
            status_text = "Response To USCIS' Request For Evidence Was Received"
        elif "BIOMETRICS" in milestones_to_save:
            bio_date = milestones_to_save["BIOMETRICS"]
            if bio_date > date.today():
                status_text = "Biometrics Appointment Scheduled"
            else:
                status_text = "Case Was Updated To Show Fingerprints Were Taken"
        elif "RFE_SENT" in milestones_to_save:
            status_text = "Request for Additional Evidence Was Sent"

    is_completed = "APPROVED" in milestones_to_save or "DENIED" in milestones_to_save
    completed_date = milestones_to_save.get("APPROVED") or milestones_to_save.get("DENIED")

    # 1. Upsert Case
    case_record = {
        "user_id": request.user_id,
        "form_type": form_type,
        "receipt_number": receipt_num,
        "service_center": request.service_center,
        "filed_date": str(milestones_to_save["RECEIVED"]),
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
            raise HTTPException(status_code=500, detail="Failed to write case.")
            
        case_id = case_response.data[0]["id"]
        
        # 2. Insert milestones
        for milestone_type, event_date in milestones_to_save.items():
            supabase.table("milestones").upsert({
                "case_id": case_id,
                "milestone_type": milestone_type,
                "event_date": str(event_date)
            }, on_conflict="case_id,milestone_type").execute()
            
        full_case_response = supabase.table("cases")\
            .select("*, milestones(*)")\
            .eq("id", case_id)\
            .execute()
            
        return {
            "success": True,
            "case": full_case_response.data[0]
        }
    except Exception as e:
        logger.error(f"Error importing detailed case: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/analytics/trigger")
async def trigger_analytics(background_tasks: BackgroundTasks):
    """Triggers the batch calculation process as a background task."""
    background_tasks.add_task(run_survival_analysis)
    return {"message": "Batch survival analysis triggered in the background."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
