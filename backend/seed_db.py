import os
import random
import logging
from datetime import datetime, date, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load env
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Supabase environment variables not found.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clear_existing_data():
    logger.info("Clearing existing data from database...")
    try:
        # Milestones delete cascades (foreign key checks)
        # We can delete all rows in cases (which cascades to milestones)
        supabase.table("cases").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        supabase.table("predictions_summary").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        logger.info("Database cleared.")
    except Exception as e:
        logger.warning(f"Error clearing database: {str(e)}. Proceeding anyway.")

def choose_country_code():
    # Standard Visa Bulletin categories have higher weights, but seed a large number of other countries
    countries_pool = [
        ("IN", 0.14), ("CN", 0.09), ("MX", 0.08), ("PH", 0.05),
        ("GB", 0.04), ("DE", 0.03), ("FR", 0.03), ("CA", 0.05),
        ("BR", 0.04), ("CO", 0.04), ("VE", 0.03), ("NG", 0.05),
        ("EG", 0.03), ("ZA", 0.02), ("AU", 0.04), ("NZ", 0.02),
        ("KR", 0.04), ("JP", 0.03), ("VN", 0.04), ("SV", 0.03),
        # West African specific countries requested
        ("BJ", 0.02), ("CI", 0.03), ("TG", 0.02), ("GH", 0.03),
        ("ROW", 0.04)
    ]
    codes, weights = zip(*countries_pool)
    return random.choices(codes, weights=weights)[0]

def generate_cases():
    logger.info("Generating realistic crowdsourced case data...")
    today = date.today()
    cases_batch = []
    milestones_batch = []
    
    # 1. Contiguous Block for I-485 at NBC
    # MSC2690189000 to MSC2690189300
    base_msc = 2690189000
    for i in range(300):
        receipt_num = f"MSC{base_msc + i}"
        form_type = "I-485"
        service_center = "National Benefits Center"
        
        # Randomize covariates
        concurrent_filing = random.random() < 0.65  # 65% concurrent
        premium_processed = False  # I-485 doesn't have premium (historically, but let's keep it False)
        
        country_code = choose_country_code()
            
        # File date between 450 days ago and 45 days ago
        filed_days_ago = random.randint(45, 450)
        filed_date = today - timedelta(days=filed_days_ago)
        
        # Calculate completion speed factors
        # Baseline median is 200 days
        base_speed = random.normalvariate(200, 50)
        base_speed = max(base_speed, 60)
        
        # Covariates impact speed:
        # Backlog countries take 1.4x longer
        if country_code in ("IN", "CN"):
            base_speed *= 1.4
        elif country_code in ("MX", "PH"):
            base_speed *= 1.2
            
        # Concurrent filing takes 0.9x time (faster/optimized processing)
        if concurrent_filing:
            base_speed *= 0.9
            
        processing_days = int(base_speed)
        
        is_completed = filed_days_ago > processing_days
        completed_date = None
        status = "Case Was Received and A Receipt Notice Was Sent"
        
        # Define milestones
        case_milestones = []
        case_milestones.append(("RECEIVED", filed_date))
        
        # Biometrics within 20-40 days
        bio_days = random.randint(20, 40)
        if filed_days_ago > bio_days:
            case_milestones.append(("BIOMETRICS", filed_date + timedelta(days=bio_days)))
            status = "Case Was Updated To Show Fingerprints Were Taken"
            
        # RFE in 20% of cases
        has_rfe = random.random() < 0.20
        rfe_sent_days = random.randint(50, 150)
        if has_rfe and filed_days_ago > rfe_sent_days:
            rfe_date = filed_date + timedelta(days=rfe_sent_days)
            case_milestones.append(("RFE_SENT", rfe_date))
            status = "Request for Additional Evidence Was Sent"
            
            rfe_resp_days = random.randint(15, 40)
            if filed_days_ago > (rfe_sent_days + rfe_resp_days):
                resp_date = rfe_date + timedelta(days=rfe_resp_days)
                case_milestones.append(("RFE_RESPONSE", resp_date))
                status = "Response To USCIS' Request For Evidence Was Received"
                
        # Handle decision
        if is_completed:
            completed_date = filed_date + timedelta(days=processing_days)
            # 95% approved, 5% denied
            if random.random() < 0.95:
                case_milestones.append(("APPROVED", completed_date))
                status = "Case Was Approved"
            else:
                case_milestones.append(("DENIED", completed_date))
                status = "Case Was Denied"
        
        cases_batch.append({
            "user_id": "seeder_user",
            "form_type": form_type,
            "receipt_number": receipt_num,
            "service_center": service_center,
            "filed_date": filed_date.isoformat(),
            "current_status": status,
            "completed_date": completed_date.isoformat() if completed_date else None,
            "concurrent_filing": concurrent_filing,
            "country_code": country_code,
            "premium_processed": premium_processed
        })
        
        # Save reference for milestones mapping
        # Since we're bulk inserting, we will map them using receipt numbers during database insertion
        milestones_batch.append((receipt_num, case_milestones))

    # 2. Contiguous Block for I-765 at NBC (Employment Authorization)
    # MSC2690190000 to MSC2690190100 (100 cases)
    base_i765 = 2690190000
    for i in range(100):
        receipt_num = f"MSC{base_i765 + i}"
        form_type = "I-765"
        service_center = "National Benefits Center"
        
        concurrent_filing = random.random() < 0.40
        premium_processed = random.random() < 0.30  # 30% premium processing!
        
        country_code = choose_country_code()
        
        filed_days_ago = random.randint(20, 200)
        filed_date = today - timedelta(days=filed_days_ago)
        
        # Baseline median is 90 days, but premium is 30 days
        if premium_processed:
            base_speed = random.normalvariate(25, 5)
            base_speed = max(base_speed, 10)
        else:
            base_speed = random.normalvariate(80, 20)
            base_speed = max(base_speed, 30)
            
        processing_days = int(base_speed)
        is_completed = filed_days_ago > processing_days
        completed_date = None
        status = "Case Was Received and A Receipt Notice Was Sent"
        
        case_milestones = [("RECEIVED", filed_date)]
        
        bio_days = random.randint(15, 30)
        if filed_days_ago > bio_days:
            case_milestones.append(("BIOMETRICS", filed_date + timedelta(days=bio_days)))
            status = "Case Was Updated To Show Fingerprints Were Taken"
            
        if is_completed:
            completed_date = filed_date + timedelta(days=processing_days)
            case_milestones.append(("APPROVED", completed_date))
            status = "Case Was Approved"
            
        cases_batch.append({
            "user_id": "seeder_user",
            "form_type": form_type,
            "receipt_number": receipt_num,
            "service_center": service_center,
            "filed_date": filed_date.isoformat(),
            "current_status": status,
            "completed_date": completed_date.isoformat() if completed_date else None,
            "concurrent_filing": concurrent_filing,
            "country_code": country_code,
            "premium_processed": premium_processed
        })
        milestones_batch.append((receipt_num, case_milestones))

    # 3. Contiguous Block for I-130 at Texas Service Center
    # SRC2690270000 to SRC2690270050 (50 cases)
    base_i130 = 2690270000
    for i in range(50):
        receipt_num = f"SRC{base_i130 + i}"
        form_type = "I-130"
        service_center = "Texas Service Center"
        
        concurrent_filing = random.random() < 0.20
        premium_processed = False  # I-130 crowdsourced generally doesn't use premium
        
        country_code = choose_country_code()
            
        filed_days_ago = random.randint(60, 600)
        filed_date = today - timedelta(days=filed_days_ago)
        
        # Baseline median is 300 days
        base_speed = random.normalvariate(300, 70)
        base_speed = max(base_speed, 120)
        
        # Backlog countries take longer
        if country_code in ("MX", "IN"):
            base_speed *= 1.3
            
        processing_days = int(base_speed)
        is_completed = filed_days_ago > processing_days
        completed_date = None
        status = "Case Was Received and A Receipt Notice Was Sent"
        
        case_milestones = [("RECEIVED", filed_date)]
        
        # RFE in 15% of cases
        has_rfe = random.random() < 0.15
        rfe_sent_days = random.randint(100, 250)
        if has_rfe and filed_days_ago > rfe_sent_days:
            rfe_date = filed_date + timedelta(days=rfe_sent_days)
            case_milestones.append(("RFE_SENT", rfe_date))
            status = "Request for Additional Evidence Was Sent"
            
            rfe_resp_days = random.randint(20, 60)
            if filed_days_ago > (rfe_sent_days + rfe_resp_days):
                resp_date = rfe_date + timedelta(days=rfe_resp_days)
                case_milestones.append(("RFE_RESPONSE", resp_date))
                status = "Response To USCIS' Request For Evidence Was Received"
                
        if is_completed:
            completed_date = filed_date + timedelta(days=processing_days)
            case_milestones.append(("APPROVED", completed_date))
            status = "Case Was Approved"
            
        cases_batch.append({
            "user_id": "seeder_user",
            "form_type": form_type,
            "receipt_number": receipt_num,
            "service_center": service_center,
            "filed_date": filed_date.isoformat(),
            "current_status": status,
            "completed_date": completed_date.isoformat() if completed_date else None,
            "concurrent_filing": concurrent_filing,
            "country_code": country_code,
            "premium_processed": premium_processed
        })
        milestones_batch.append((receipt_num, case_milestones))

    # 4. Specific Tracked Cases for dev_user_1 (matching App.jsx MOCK_CASES)
    mock_dev_cases = [
        {
            "user_id": "dev_user_1",
            "form_type": "I-485",
            "receipt_number": "MSC2690184719",
            "service_center": "National Benefits Center",
            "filed_date": "2025-10-15",
            "current_status": "Case Was Approved",
            "completed_date": "2026-05-10",
            "concurrent_filing": True,
            "premium_processed": False,
            "country_code": "IN",
            "milestones": [
                ("RECEIVED", date(2025, 10, 15)),
                ("BIOMETRICS", date(2025, 11, 20)),
                ("RFE_SENT", date(2026, 2, 14)),
                ("RFE_RESPONSE", date(2026, 3, 5)),
                ("APPROVED", date(2026, 5, 10))
            ]
        },
        {
            "user_id": "dev_user_1",
            "form_type": "I-765",
            "receipt_number": "MSC2690189472",
            "service_center": "National Benefits Center",
            "filed_date": "2026-03-10",
            "current_status": "Biometrics Appointment Scheduled",
            "completed_date": None,
            "concurrent_filing": False,
            "premium_processed": True,
            "country_code": "ROW",
            "milestones": [
                ("RECEIVED", date(2026, 3, 10)),
                ("BIOMETRICS", date(2026, 4, 12))
            ]
        },
        {
            "user_id": "dev_user_1",
            "form_type": "I-130",
            "receipt_number": "SRC2690274819",
            "service_center": "Texas Service Center",
            "filed_date": "2025-08-01",
            "current_status": "Request for Additional Evidence Sent",
            "completed_date": None,
            "concurrent_filing": False,
            "premium_processed": False,
            "country_code": "MX",
            "milestones": [
                ("RECEIVED", date(2025, 8, 1)),
                ("RFE_SENT", date(2026, 1, 20))
            ]
        }
    ]

    for mc in mock_dev_cases:
        cases_batch.append({
            "user_id": mc["user_id"],
            "form_type": mc["form_type"],
            "receipt_number": mc["receipt_number"],
            "service_center": mc["service_center"],
            "filed_date": mc["filed_date"],
            "current_status": mc["current_status"],
            "completed_date": mc["completed_date"],
            "concurrent_filing": mc["concurrent_filing"],
            "country_code": mc["country_code"],
            "premium_processed": mc["premium_processed"]
        })
        milestones_batch.append((mc["receipt_number"], mc["milestones"]))

    # Bulk Insert Cases in groups of 100
    logger.info(f"Inserting {len(cases_batch)} cases into Supabase...")
    inserted_cases = []
    for j in range(0, len(cases_batch), 100):
        chunk = cases_batch[j:j+100]
        res = supabase.table("cases").insert(chunk).execute()
        inserted_cases.extend(res.data)
        
    logger.info(f"Inserted {len(inserted_cases)} cases successfully.")
    
    # Map receipt_number to case_id
    receipt_to_id = {c["receipt_number"]: c["id"] for c in inserted_cases}
    
    # Flatten milestones for insertion
    milestones_insert = []
    for receipt_num, ms_list in milestones_batch:
        case_id = receipt_to_id.get(receipt_num)
        if not case_id:
            continue
        for milestone_type, event_date in ms_list:
            milestones_insert.append({
                "case_id": case_id,
                "milestone_type": milestone_type,
                "event_date": event_date.isoformat()
            })
            
    logger.info(f"Inserting {len(milestones_insert)} milestones into Supabase...")
    for j in range(0, len(milestones_insert), 100):
        chunk = milestones_insert[j:j+100]
        supabase.table("milestones").insert(chunk).execute()
        
    logger.info("Milestones inserted. Seeding finished!")

if __name__ == "__main__":
    clear_existing_data()
    generate_cases()
