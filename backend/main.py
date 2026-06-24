import os
import logging
from typing import Optional, List
from datetime import date, datetime
import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

# Import our custom clients and modules
from uscis_client import USCISClient
from batch_analytics import run_survival_analysis, parse_date
import receipt_utils

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
    form_type: Optional[str] = None
    service_center: Optional[str] = None
    filed_date: Optional[str] = None
    concurrent_filing: Optional[bool] = False
    premium_processed: Optional[bool] = False
    country_code: Optional[str] = "ROW"

class ReceiptLookupRequest(BaseModel):
    receipt_number: str

class CaseSaveRequest(BaseModel):
    receipt_number: str
    user_id: str = "dev_user_1"
    form_type: Optional[str] = None
    service_center: Optional[str] = None
    filed_date: Optional[str] = None
    concurrent_filing: Optional[bool] = False
    premium_processed: Optional[bool] = False
    country_code: Optional[str] = "ROW"


@app.get("/")
def read_root():
    return {"message": "Welcome to the Crowdsourced Immigration Timeline Predictor API"}

def log_sync_attempt(environment: str, endpoint: str, receipt_number: str, http_status: int, success: bool, response_time_ms: float, error_code: Optional[str] = None, error_message: Optional[str] = None):
    if not supabase:
        return
    try:
        prefix = receipt_utils.get_receipt_prefix(receipt_number)
        seq = receipt_utils.get_receipt_numeric_sequence(receipt_number)
        last4 = seq[-4:] if len(seq) >= 4 else seq
        
        supabase.table("sync_logs").insert({
            "environment": environment,
            "endpoint": endpoint,
            "receipt_prefix": prefix,
            "receipt_number_last4": last4,
            "http_status": http_status,
            "success": success,
            "response_time_ms": response_time_ms,
            "error_code": error_code,
            "error_message": error_message
        }).execute()
    except Exception as e:
        logger.warning(f"Failed to write to sync_logs table (it might not exist yet): {str(e)}")

@app.post("/api/lookup")
async def lookup_receipt(request: ReceiptLookupRequest):
    import time
    receipt_num = receipt_utils.normalize_receipt_number(request.receipt_number)
    if not receipt_utils.validate_receipt_number(receipt_num):
        raise HTTPException(status_code=400, detail="Invalid receipt number format. Must be 3 letters followed by 10 numbers.")
        
    prefix = receipt_utils.get_receipt_prefix(receipt_num)
    service_center = receipt_utils.infer_service_center(receipt_num)
    
    start_time = time.time()
    result = await uscis.fetch_case_status(receipt_num)
    duration_ms = (time.time() - start_time) * 1000
    
    log_sync_attempt(
        environment="sandbox",
        endpoint="/api/lookup",
        receipt_number=receipt_num,
        http_status=result.get("http_status", 200) if result.get("success") else result.get("http_status", 400),
        success=result.get("success", False),
        response_time_ms=duration_ms,
        error_code=result.get("error_code") if not result.get("success") else None,
        error_message=result.get("error_message") if not result.get("success") else None
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=result.get("http_status", 400), detail=result.get("error_message", "USCIS API Error"))
        
    return {
        "receipt_number": receipt_num,
        "receipt_prefix": prefix,
        "service_center_inferred": service_center,
        "success": True,
        "http_status": 200,
        "current_status": result.get("current_status"),
        "current_status_date": result.get("current_status_date"),
        "filed_date": None,
        "form_type": result.get("form_type"),
        "data_source": "uscis_sandbox",
        "data_confidence": "Sandbox",
        "missing_fields": ["filed_date"]
    }

@app.post("/api/cases")
async def save_case(request: CaseSaveRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    receipt_num = receipt_utils.normalize_receipt_number(request.receipt_number)
    if not receipt_utils.validate_receipt_number(receipt_num):
        raise HTTPException(status_code=400, detail="Invalid receipt number format.")
        
    prefix = receipt_utils.get_receipt_prefix(receipt_num)
    service_center = request.service_center or receipt_utils.infer_service_center(receipt_num)
    
    import time
    start_time = time.time()
    result = await uscis.fetch_case_status(receipt_num)
    duration_ms = (time.time() - start_time) * 1000
    
    status_text = "Case Was Received"
    status_date = None
    form_type = request.form_type
    
    if result.get("success"):
        status_text = result.get("current_status", status_text)
        status_date = result.get("current_status_date")
        if not form_type:
            form_type = result.get("form_type")
            
    log_sync_attempt(
        environment="sandbox",
        endpoint="/api/cases",
        receipt_number=receipt_num,
        http_status=result.get("http_status", 200) if result.get("success") else result.get("http_status", 400),
        success=result.get("success", False),
        response_time_ms=duration_ms,
        error_code=result.get("error_code") if not result.get("success") else None,
        error_message=result.get("error_message") if not result.get("success") else None
    )

    status_lower = status_text.lower()
    is_completed = "approved" in status_lower or "denied" in status_lower
    completed_date = status_date if is_completed else None
    
    case_record = {
        "user_id": request.user_id,
        "receipt_number": receipt_num,
        "receipt_prefix": prefix,
        "receipt_number_last4": receipt_num[-4:],
        "form_type": form_type or "Unknown",
        "service_center": service_center,
        "filed_date": request.filed_date if request.filed_date else None,
        "current_status": status_text,
        "current_status_date": status_date,
        "completed_date": completed_date,
        "is_completed": is_completed,
        "data_source": "uscis_sandbox",
        "data_confidence": "Sandbox",
        "last_sync_date": "now()",
        "concurrent_filing": request.concurrent_filing,
        "premium_processed": request.premium_processed,
        "country_code": request.country_code or "ROW"
    }
    
    try:
        try:
            case_response = supabase.table("cases").upsert(
                case_record,
                on_conflict="receipt_number"
            ).execute()
        except Exception as db_err:
            logger.warning(f"Extended schema upsert failed, trying fallback schema: {str(db_err)}")
            fallback_record = {
                "user_id": request.user_id,
                "receipt_number": receipt_num,
                "form_type": form_type or "Unknown",
                "service_center": service_center,
                "filed_date": request.filed_date if request.filed_date else "1970-01-01",
                "current_status": status_text,
                "last_sync_date": "now()",
                "completed_date": completed_date,
                "concurrent_filing": request.concurrent_filing,
                "premium_processed": request.premium_processed,
                "country_code": request.country_code or "ROW"
            }
            case_response = supabase.table("cases").upsert(
                fallback_record,
                on_conflict="receipt_number"
            ).execute()
            
        if not case_response.data:
            raise HTTPException(status_code=500, detail="Failed to write case to database.")
            
        case_id = case_response.data[0]["id"]
        
        try:
            if request.filed_date:
                supabase.table("milestones").upsert({
                    "case_id": case_id,
                    "milestone_type": "RECEIVED",
                    "event_date": request.filed_date
                }, on_conflict="case_id,milestone_type").execute()
                
            if is_completed:
                m_type = "APPROVED" if "approved" in status_lower else "DENIED"
                if completed_date:
                    supabase.table("milestones").upsert({
                        "case_id": case_id,
                        "milestone_type": m_type,
                        "event_date": completed_date
                    }, on_conflict="case_id,milestone_type").execute()
        except Exception as m_err:
            logger.warning(f"Milestones upsert failed: {str(m_err)}")
            
        try:
            supabase.table("case_status_snapshots").insert({
                "case_id": case_id,
                "receipt_prefix": prefix,
                "receipt_number_last4": receipt_num[-4:],
                "status_text": status_text,
                "status_date": status_date,
                "http_status": 200 if result.get("success") else result.get("http_status", 400),
                "success": result.get("success", False),
                "source": "uscis_sandbox",
                "raw_response": result.get("raw_response", {})
            }).execute()
        except Exception as snap_err:
            logger.warning(f"Snapshot insert failed: {str(snap_err)}")
            
        full_case_response = supabase.table("cases")\
            .select("*, milestones(*)")\
            .eq("id", case_id)\
            .execute()
            
        return {
            "success": True,
            "case": full_case_response.data[0]
        }
    except Exception as e:
        logger.error(f"Error saving case: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/cases/{case_id}/refresh")
async def refresh_case(case_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    try:
        res = supabase.table("cases").select("*").eq("id", case_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Case not found.")
            
        curr_case = res.data[0]
        receipt_num = curr_case["receipt_number"]
        
        import time
        start_time = time.time()
        result = await uscis.fetch_case_status(receipt_num)
        duration_ms = (time.time() - start_time) * 1000
        
        log_sync_attempt(
            environment="sandbox",
            endpoint=f"/api/cases/refresh",
            receipt_number=receipt_num,
            http_status=result.get("http_status", 200) if result.get("success") else result.get("http_status", 400),
            success=result.get("success", False),
            response_time_ms=duration_ms,
            error_code=result.get("error_code") if not result.get("success") else None,
            error_message=result.get("error_message") if not result.get("success") else None
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=result.get("http_status", 400), detail=result.get("error_message", "Refresh failed."))
            
        status_text = result.get("current_status")
        status_date = result.get("current_status_date")
        
        status_lower = status_text.lower()
        is_completed = "approved" in status_lower or "denied" in status_lower
        completed_date = status_date if is_completed else None
        
        update_record = {
            "current_status": status_text,
            "current_status_date": status_date,
            "completed_date": completed_date,
            "is_completed": is_completed,
            "last_sync_date": "now()",
            "last_checked_at": "now()",
            "updated_at": "now()"
        }
        
        try:
            supabase.table("cases").update(update_record).eq("id", case_id).execute()
        except Exception:
            fallback_update = {
                "current_status": status_text,
                "completed_date": completed_date,
                "last_sync_date": "now()"
            }
            supabase.table("cases").update(fallback_update).eq("id", case_id).execute()
            
        try:
            supabase.table("case_status_snapshots").insert({
                "case_id": case_id,
                "receipt_prefix": receipt_num[:3],
                "receipt_number_last4": receipt_num[-4:],
                "status_text": status_text,
                "status_date": status_date,
                "http_status": 200,
                "success": True,
                "source": "uscis_sandbox",
                "raw_response": result.get("raw_response", {})
            }).execute()
        except Exception as snap_err:
            logger.warning(f"Snapshot insert failed: {snap_err}")
            
        full_case_response = supabase.table("cases")\
            .select("*, milestones(*)")\
            .eq("id", case_id)\
            .execute()
            
        return {
            "success": True,
            "case": full_case_response.data[0]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing case: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/admin/sandbox-traffic-summary")
async def get_sandbox_traffic_summary():
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    try:
        res = supabase.table("sync_logs").select("*").execute()
        logs = res.data or []
        
        df = pd.DataFrame(logs)
        if df.empty:
            return {
                "environment": "sandbox",
                "days": [],
                "consecutive_days": 0,
                "ready_for_production_request": False
            }
            
        df['date'] = pd.to_datetime(df['checked_at']).dt.date.astype(str)
        grouped = df.groupby('date')
        days_summary = []
        for date_str, group in grouped:
            total = len(group)
            success_200 = int((group['http_status'] == 200).sum())
            client_errors = int(((group['http_status'] >= 400) & (group['http_status'] < 500)).sum())
            server_errors = int((group['http_status'] >= 500).sum())
            avg_time = float(group['response_time_ms'].mean()) if 'response_time_ms' in group else 0.0
            
            days_summary.append({
                "date": date_str,
                "total_requests": total,
                "success_200": success_200,
                "client_errors_4xx": client_errors,
                "server_errors_5xx": server_errors,
                "avg_response_time_ms": round(avg_time, 1)
            })
            
        days_summary.sort(key=lambda x: x['date'])
        unique_dates = sorted(list(df['date'].unique()))
        consecutive = 0
        if unique_dates:
            consecutive = 1
            max_consec = 1
            for idx in range(1, len(unique_dates)):
                d1 = datetime.strptime(unique_dates[idx-1], "%Y-%m-%d")
                d2 = datetime.strptime(unique_dates[idx], "%Y-%m-%d")
                if (d2 - d1).days == 1:
                    consecutive += 1
                    max_consec = max(max_consec, consecutive)
                elif (d2 - d1).days > 1:
                    consecutive = 1
            consecutive = max_consec
            
        return {
            "environment": "sandbox",
            "days": days_summary,
            "consecutive_days": consecutive,
            "ready_for_production_request": consecutive >= 5
        }
    except Exception as e:
        logger.error(f"Error compiling sandbox traffic summary: {str(e)}")
        return {
            "environment": "sandbox",
            "days": [],
            "consecutive_days": 0,
            "ready_for_production_request": False,
            "note": "sync_logs table does not exist or database query failed."
        }


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

    receipt_num = receipt_utils.normalize_receipt_number(request.receipt_number)
    if not receipt_utils.validate_receipt_number(receipt_num):
        raise HTTPException(status_code=400, detail="Invalid receipt number format.")

    user_id = request.user_id
    prefix = receipt_utils.get_receipt_prefix(receipt_num)
    service_center = request.service_center or receipt_utils.infer_service_center(receipt_num)
    
    import time
    start_time = time.time()
    # 1. Fetch case status from USCIS Sandbox API
    uscis_data = await uscis.fetch_case_status(receipt_num)
    duration_ms = (time.time() - start_time) * 1000

    log_sync_attempt(
        environment="sandbox",
        endpoint="/api/cases/sync",
        receipt_number=receipt_num,
        http_status=uscis_data.get("http_status", 200) if uscis_data.get("success") else uscis_data.get("http_status", 400),
        success=uscis_data.get("success", False),
        response_time_ms=duration_ms,
        error_code=uscis_data.get("error_code") if not uscis_data.get("success") else None,
        error_message=uscis_data.get("error_message") if not uscis_data.get("success") else None
    )
    
    if not uscis_data.get("success"):
        # Genuine API connection/authentication or bad request errors (e.g. 401, 422) should still fail
        raise HTTPException(
            status_code=uscis_data.get("http_status", 400), 
            detail=f"USCIS Sandbox check failed: {uscis_data.get('error_message', 'API Error')}. Verify credentials or receipt number."
        )
    
    # Sandbox API returns values like: formType, submittedDate, modifiedDate, current_case_status_text_en
    # nested within the "case_status" key. Ensure they map properly.
    case_status_data = uscis_data.get("raw_response", {}).get("case_status", {})
    if not case_status_data:
        case_status_data = uscis_data
    form_type = case_status_data.get("formType") or request.form_type
    status_text = uscis_data.get("current_status", "Case Was Received")
    submitted_date_str = case_status_data.get("submittedDate") or request.filed_date
    modified_date_str = case_status_data.get("modifiedDate")

    submitted_date = parse_date(submitted_date_str) if submitted_date_str else None
    modified_date = parse_date(modified_date_str) if modified_date_str else None

    # Determine milestones and completion status
    status_lower = status_text.lower()
    is_completed = "approved" in status_lower or "denied" in status_lower
    completed_date = modified_date if is_completed else None

    # 2. Upsert Case to Supabase
    case_record = {
        "user_id": user_id,
        "receipt_number": receipt_num,
        "receipt_prefix": prefix,
        "receipt_number_last4": receipt_num[-4:],
        "form_type": form_type or "Unknown",
        "service_center": service_center,
        "filed_date": str(submitted_date) if submitted_date else None,
        "current_status": status_text,
        "last_sync_date": "now()",
        "completed_date": str(completed_date) if completed_date else None,
        "concurrent_filing": request.concurrent_filing,
        "premium_processed": request.premium_processed,
        "country_code": request.country_code or "ROW",
        "is_completed": is_completed,
        "data_source": "uscis_sandbox",
        "data_confidence": "Sandbox"
    }

    try:
        try:
            case_response = supabase.table("cases").upsert(
                case_record,
                on_conflict="receipt_number"
            ).execute()
        except Exception as db_err:
            logger.warning(f"Extended upsert failed in sync_case, falling back to original schema: {str(db_err)}")
            fallback_record = {
                "user_id": user_id,
                "form_type": form_type or "Unknown",
                "receipt_number": receipt_num,
                "service_center": service_center,
                "filed_date": str(submitted_date) if submitted_date else "1970-01-01",
                "current_status": status_text,
                "last_sync_date": "now()",
                "completed_date": str(completed_date) if completed_date else None,
                "concurrent_filing": request.concurrent_filing,
                "premium_processed": request.premium_processed,
                "country_code": request.country_code or "ROW"
            }
            case_response = supabase.table("cases").upsert(
                fallback_record,
                on_conflict="receipt_number"
            ).execute()

        if not case_response.data:
            raise HTTPException(status_code=500, detail="Failed to write case to database.")

        case_id = case_response.data[0]["id"]

        # 3. Create milestones
        try:
            if submitted_date or request.filed_date:
                supabase.table("milestones").upsert({
                    "case_id": case_id,
                    "milestone_type": "RECEIVED",
                    "event_date": str(submitted_date or request.filed_date)
                }, on_conflict="case_id,milestone_type").execute()

            if is_completed:
                milestone_type = "APPROVED" if "approved" in status_lower else "DENIED"
                supabase.table("milestones").upsert({
                    "case_id": case_id,
                    "milestone_type": milestone_type,
                    "event_date": str(completed_date or "now()")
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
        except Exception as m_err:
            logger.warning(f"Milestones upsert failed: {str(m_err)}")

        try:
            supabase.table("case_status_snapshots").insert({
                "case_id": case_id,
                "receipt_prefix": prefix,
                "receipt_number_last4": receipt_num[-4:],
                "status_text": status_text,
                "status_date": submitted_date,
                "http_status": 200,
                "success": True,
                "source": "uscis_sandbox",
                "raw_response": uscis_data.get("raw_response", {})
            }).execute()
        except Exception as snap_err:
            logger.warning(f"Snapshot insert failed: {str(snap_err)}")

        # Fetch the complete case with milestones
        full_case_response = supabase.table("cases")\
            .select("*, milestones(*)")\
            .eq("id", case_id)\
            .execute()

        if not full_case_response.data:
            raise HTTPException(status_code=500, detail="Failed to retrieve complete case data.")

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
        
    # Extract covariates
    premium_processed = payload.get("isPremiumProcessed") or payload.get("is_premium_processed") or payload.get("premiumProcessed") or False
    
    concurrent_cases = payload.get("concurrentCases")
    concurrent_filing = False
    if isinstance(concurrent_cases, list) and len(concurrent_cases) > 0:
        concurrent_filing = True
    elif payload.get("concurrent_filing") or payload.get("concurrentFiling"):
        concurrent_filing = True
        
    country_code = payload.get("countryCode") or payload.get("country_code") or "ROW"
        
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
        "completed_date": str(completed_date) if completed_date else None,
        "concurrent_filing": concurrent_filing,
        "premium_processed": premium_processed,
        "country_code": country_code
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

@app.get("/api/cases/{receipt_number}/queue-insights")
async def get_queue_insights(receipt_number: str):
    """
    Computes crowdsourced queue standings and milestone transit times for a case.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    try:
        receipt_num = receipt_number.strip().upper()
        # 1. Fetch current case
        case_res = supabase.table("cases").select("*, milestones(*)").eq("receipt_number", receipt_num).execute()
        if not case_res.data:
            raise HTTPException(status_code=404, detail="Case not found.")
            
        curr_case = case_res.data[0]
        form_type = curr_case["form_type"]
        service_center = curr_case["service_center"]
        user_filed_date = parse_date(curr_case["filed_date"])
        
        if not user_filed_date:
            raise HTTPException(status_code=400, detail="Invalid case filed date.")
            
        # 2. Fetch all cases in category with milestones to compute rankings & stats
        all_res = supabase.table("cases")\
            .select("id, filed_date, completed_date, current_status, milestones(milestone_type, event_date)")\
            .eq("form_type", form_type)\
            .eq("service_center", service_center)\
            .execute()
            
        cases_data = all_res.data or []
        
        # 3. Compute stats
        pending_ahead = 0
        approved_behind = 0
        
        cohort_total = 0
        cohort_approved = 0
        
        transit_biometrics = []
        transit_rfe_sent = []
        transit_rfe_resp = []
        transit_total_decision = []
        
        for c in cases_data:
            c_filed = parse_date(c["filed_date"])
            c_completed = parse_date(c["completed_date"])
            c_status_lower = (c["current_status"] or "").lower()
            c_is_completed = (c_completed is not None) or ("approved" in c_status_lower) or ("denied" in c_status_lower)
            
            if not c_filed:
                continue
                
            # Queue counts
            if not c_is_completed:
                if c_filed < user_filed_date:
                    pending_ahead += 1
            else:
                if c_filed > user_filed_date:
                    approved_behind += 1
                    
            # Cohort group (same month and year)
            if c_filed.year == user_filed_date.year and c_filed.month == user_filed_date.month:
                cohort_total += 1
                if c_is_completed:
                    cohort_approved += 1
                    
            # Milestones calculation
            m_list = c.get("milestones") or []
            m_dates = {}
            for m in m_list:
                m_type = m.get("milestone_type")
                m_date = parse_date(m.get("event_date"))
                if m_type and m_date:
                    m_dates[m_type] = m_date
                    
            # Set filing date as start
            start_date = c_filed
            
            # RECEIVED -> BIOMETRICS
            if "BIOMETRICS" in m_dates:
                days = (m_dates["BIOMETRICS"] - start_date).days
                if days >= 0:
                    transit_biometrics.append(days)
                    
            # RECEIVED -> RFE_SENT
            if "RFE_SENT" in m_dates:
                days = (m_dates["RFE_SENT"] - start_date).days
                if days >= 0:
                    transit_rfe_sent.append(days)
                    
            # RFE_SENT -> RFE_RESPONSE
            if "RFE_SENT" in m_dates and "RFE_RESPONSE" in m_dates:
                days = (m_dates["RFE_RESPONSE"] - m_dates["RFE_SENT"]).days
                if days >= 0:
                    transit_rfe_resp.append(days)
                    
            # RECEIVED -> DECISION (APPROVED or DENIED)
            decision_date = c_completed or m_dates.get("APPROVED") or m_dates.get("DENIED")
            if decision_date:
                days = (decision_date - start_date).days
                if days >= 0:
                    transit_total_decision.append(days)
                    
        # Compute averages (or default to fallback stats if no historical records exist)
        def avg(lst, default_val):
            return int(round(sum(lst) / len(lst))) if lst else default_val
            
        avg_bio = avg(transit_biometrics, 40)
        avg_rfe = avg(transit_rfe_sent, 120)
        avg_resp = avg(transit_rfe_resp, 45)
        avg_dec = avg(transit_total_decision, 210)
        
        cohort_approved_pct = round((cohort_approved / cohort_total) * 100, 1) if cohort_total > 0 else 0.0
        
        # User's milestones
        user_m_list = curr_case.get("milestones") or []
        user_m_types = [m.get("milestone_type") for m in user_m_list]
        
        return {
            "receipt_number": receipt_num,
            "form_type": form_type,
            "service_center": service_center,
            "queue_position": pending_ahead + 1,
            "pending_ahead": pending_ahead,
            "approved_behind": approved_behind,
            "cohort_total": cohort_total,
            "cohort_approved": cohort_approved,
            "cohort_approved_pct": cohort_approved_pct,
            "averages": {
                "received_to_biometrics": avg_bio,
                "received_to_rfe_sent": avg_rfe,
                "rfe_sent_to_response": avg_resp,
                "received_to_decision": avg_dec
            },
            "user_milestones": user_m_types
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error computing queue insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/analytics/trigger")
async def trigger_analytics(background_tasks: BackgroundTasks):
    """Triggers the batch calculation process as a background task."""
    background_tasks.add_task(run_survival_analysis)
    return {"message": "Batch survival analysis triggered in the background."}

@app.get("/api/analytics/global")
async def get_global_analytics():
    """
    Computes global analytics across all cases:
    1. Nationality statistics (approvals, pending, wait times)
    2. Monthly approval processing trends
    3. Service center processing comparisons
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database client not configured.")
        
    try:
        # Fetch all cases
        response = supabase.table("cases").select(
            "form_type, service_center, filed_date, completed_date, current_status, country_code"
        ).execute()
        
        cases_data = response.data or []
        if not cases_data:
            return {
                "nationalities": [],
                "monthly_trends": [],
                "service_centers": []
            }
            
        df = pd.DataFrame(cases_data)
        df['filed_date'] = df['filed_date'].apply(parse_date)
        df['completed_date'] = df['completed_date'].apply(parse_date)
        df = df.dropna(subset=['filed_date'])
        
        if df.empty:
            return {
                "nationalities": [],
                "monthly_trends": [],
                "service_centers": []
            }
            
        today = date.today()
        # Compute wait days
        df['is_approved'] = df['completed_date'].notna() | df['current_status'].str.lower().str.contains("approved|delivered|mailed", na=False)
        
        def calc_days(row):
            filed = row['filed_date']
            completed = row['completed_date']
            if row['is_approved']:
                end_date = completed if completed else today
                return max((end_date - filed).days, 1)
            else:
                return max((today - filed).days, 1)
                
        df['wait_days'] = df.apply(calc_days, axis=1)
        
        # 1. Nationality Stats
        nationalities_list = []
        nat_groups = df.groupby('country_code')
        for country, group in nat_groups:
            approved_count = int(group['is_approved'].sum())
            pending_count = int((~group['is_approved']).sum())
            approved_group = group[group['is_approved']]
            avg_wait = float(approved_group['wait_days'].mean()) if not approved_group.empty else 0.0
            
            nationalities_list.append({
                "country_code": str(country).upper(),
                "approved_count": approved_count,
                "pending_count": pending_count,
                "avg_wait_days": round(avg_wait, 1)
            })
            
        # 2. Monthly Trends (grouped by month of completion, form_type)
        monthly_list = []
        approved_df = df[df['is_approved']].copy()
        if not approved_df.empty:
            # Ensure completed_date falls back to filed_date + wait_days if null
            approved_df['completion_date_filled'] = approved_df.apply(
                lambda r: r['completed_date'] if r['completed_date'] else r['filed_date'] + pd.Timedelta(days=r['wait_days']),
                axis=1
            )
            approved_df['completion_month'] = approved_df['completion_date_filled'].apply(lambda x: x.strftime('%Y-%m') if x else None)
            approved_df = approved_df.dropna(subset=['completion_month'])
            
            if not approved_df.empty:
                month_form_groups = approved_df.groupby(['completion_month', 'form_type'])
                for (month, form), group in month_form_groups:
                    median_wait = float(group['wait_days'].quantile(0.5))
                    p90_wait = float(group['wait_days'].quantile(0.9))
                    avg_wait = float(group['wait_days'].mean())
                    monthly_list.append({
                        "month": month,
                        "form_type": form,
                        "count": int(len(group)),
                        "avg_wait_days": round(avg_wait, 1),
                        "median_wait_days": round(median_wait, 1),
                        "p90_wait_days": round(p90_wait, 1)
                    })
                # Sort chronologically
                monthly_list.sort(key=lambda x: (x['month'], x['form_type']))
            
        # 3. Service Center Stats
        sc_list = []
        sc_groups = df.groupby(['service_center', 'form_type'])
        for (sc, form), group in sc_groups:
            approved_count = int(group['is_approved'].sum())
            pending_count = int((~group['is_approved']).sum())
            approved_group = group[group['is_approved']]
            avg_wait = float(approved_group['wait_days'].mean()) if not approved_group.empty else 0.0
            
            sc_list.append({
                "service_center": sc,
                "form_type": form,
                "approved_count": approved_count,
                "pending_count": pending_count,
                "avg_wait_days": round(avg_wait, 1)
            })

        # 4. Day of Week Approval Distribution
        weekday_list = []
        if not approved_df.empty:
            approved_df['weekday'] = approved_df['completion_date_filled'].apply(lambda x: x.strftime('%A'))
            day_counts = approved_df.groupby('weekday').size()
            days_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            total_approvals = int(len(approved_df))
            for day in days_order:
                count = int(day_counts.get(day, 0))
                pct = round((count / total_approvals) * 100, 1) if total_approvals > 0 else 0.0
                weekday_list.append({
                    "day": day,
                    "count": count,
                    "percentage": pct
                })
            
        return {
            "nationalities": nationalities_list,
            "monthly_trends": monthly_list,
            "service_centers": sc_list,
            "weekday_distribution": weekday_list
        }
    except Exception as e:
        logger.error(f"Error computing global stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
