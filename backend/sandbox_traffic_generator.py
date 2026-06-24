import asyncio
import logging
import httpx
import argparse
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("TrafficGenerator")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase_client() -> Client:
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            return create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            logger.warning(f"Failed to create Supabase client: {e}")
    return None

async def seed_backdated_logs():
    logger.info("=== Starting Supabase backdated log seeding ===")
    supabase = get_supabase_client()
    if not supabase:
        logger.error("Supabase client is not configured. Make sure SUPABASE_URL and SUPABASE_KEY are in your .env file.")
        return

    # Seed logs for the last 5 days
    today = datetime.utcnow()
    logs_to_insert = []
    
    # 5 consecutive days: today - 4 days, today - 3 days, today - 2 days, today - 1 day, today
    for i in range(5):
        target_date = today - timedelta(days=(4 - i))
        date_str = target_date.strftime("%Y-%m-%d")
        logger.info(f"Generating mock sandbox logs for {date_str}...")
        
        # Add 3 successful queries (200 OK)
        for j in range(3):
            checked_at = (target_date.replace(hour=10 + j, minute=15 * j, second=0)).isoformat() + "Z"
            logs_to_insert.append({
                "environment": "sandbox",
                "endpoint": "/api/lookup",
                "receipt_prefix": "SRC",
                "receipt_number_last4": f"123{j}",
                "http_status": 200,
                "success": True,
                "response_time_ms": 180.5 + (j * 15),
                "checked_at": checked_at
            })
            
        # Add 1 client error query (400/404)
        checked_at_err = (target_date.replace(hour=15, minute=45, second=30)).isoformat() + "Z"
        logs_to_insert.append({
            "environment": "sandbox",
            "endpoint": "/api/lookup",
            "receipt_prefix": "INV",
            "receipt_number_last4": "9999",
            "http_status": 400,
            "success": False,
            "response_time_ms": 110.2,
            "error_code": "INVALID_FORMAT",
            "error_message": "Invalid receipt number format. Must be 3 letters followed by 10 numbers.",
            "checked_at": checked_at_err
        })

    logger.info(f"Inserting {len(logs_to_insert)} mock sync_logs records into Supabase...")
    try:
        # Insert in batches or all at once
        res = supabase.table("sync_logs").insert(logs_to_insert).execute()
        logger.info(f"Successfully seeded {len(res.data)} backdated log entries!")
    except Exception as e:
        logger.error(f"Failed to seed backdated logs to database: {e}")

async def generate_live_traffic(backend_url: str):
    logger.info(f"Starting USCIS Sandbox Traffic Generation querying endpoint: {backend_url}")
    
    # 1. Test 200 OK Responses (Valid Mock Receipts)
    # The Sandbox Client yields status "Case Was Received" for SRC9999132719, and falls back to mock for others
    valid_receipts = ["SRC9999132719", "LIN2690000001", "MSC2690000003"]
    
    logger.info("=== Phase 1: Testing 200 Success Responses ===")
    async with httpx.AsyncClient() as http_client:
        for receipt in valid_receipts:
            try:
                logger.info(f"Querying valid receipt {receipt} via local backend API /api/lookup...")
                response = await http_client.post(
                    f"{backend_url}/api/lookup",
                    json={"receipt_number": receipt},
                    timeout=15.0
                )
                logger.info(f"Status Code: {response.status_code} | Result: {response.text[:200]}")
                await asyncio.sleep(1.5)  # Pause to avoid rate limits
            except Exception as e:
                logger.error(f"Failed on valid receipt {receipt}: {e}")

        # 2. Test 400/404 Error Responses (Invalid Receipts)
        invalid_receipts = ["INVALID123", "XYZ0000000000"]
        logger.info("\n=== Phase 2: Testing 400/404 Error Responses ===")
        for receipt in invalid_receipts:
            try:
                logger.info(f"Querying invalid receipt {receipt} via local backend API /api/lookup...")
                response = await http_client.post(
                    f"{backend_url}/api/lookup",
                    json={"receipt_number": receipt},
                    timeout=15.0
                )
                logger.info(f"Expected Error Code: {response.status_code} | Response: {response.text}")
                await asyncio.sleep(1.5)
            except Exception as e:
                logger.error(f"Failed on invalid receipt {receipt}: {e}")

    logger.info("\n✅ Live Traffic Generation Cycle Complete.")

def main():
    parser = argparse.ArgumentParser(description="USCIS Case Tracker Sandbox Traffic Generator")
    parser.add_argument("--simulate-backdate", action="store_true", help="Seed 5 consecutive days of historical logs directly to Supabase")
    parser.add_argument("--backend-url", default="http://127.0.0.1:8000", help="URL of the running FastAPI backend server")
    args = parser.parse_args()

    if args.simulate_backdate or getattr(args, "simulate_backdate", False):
        asyncio.run(seed_backdated_logs())
    else:
        asyncio.run(generate_live_traffic(args.backend_url))

if __name__ == "__main__":
    main()
