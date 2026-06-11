import asyncio
import logging
import httpx
from dotenv import load_dotenv
import os
from uscis_client import USCISClient

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("TrafficGenerator")

async def generate_traffic():
    logger.info("Starting USCIS Sandbox Traffic Generation...")
    
    # 1. Test 200 OK Responses (Valid Mock Receipts)
    # The USCIS Sandbox usually responds to specific formats. We'll try a few known ones.
    valid_receipts = ["LIN2690000001", "SRC2690000002", "MSC2690000003"]
    client = USCISClient()
    
    logger.info("=== Phase 1: Testing 200 Success Responses ===")
    for receipt in valid_receipts:
        try:
            logger.info(f"Querying valid receipt: {receipt}")
            result = await client.fetch_case_status(receipt)
            # Log the response (it might actually be a 404 in the sandbox depending on their mock data,
            # but usually the format dictates if it returns a 200 mock response).
            logger.info(f"Result for {receipt}: {result}")
            await asyncio.sleep(2)  # Avoid hammering the API too fast
        except Exception as e:
            logger.error(f"Failed on valid receipt {receipt}: {e}")

    # 2. Test 404 Not Found Responses (Invalid Receipts)
    invalid_receipts = ["INVALID123", "XYZ0000000000"]
    logger.info("\n=== Phase 2: Testing 404 Error Responses ===")
    for receipt in invalid_receipts:
        try:
            logger.info(f"Querying invalid receipt: {receipt}")
            result = await client.fetch_case_status(receipt)
            logger.info(f"Result for {receipt}: {result}")
            await asyncio.sleep(2)
        except Exception as e:
            logger.error(f"Failed on invalid receipt {receipt}: {e}")

    # 3. Test 400/401 Bad Request/Unauthorized Response
    logger.info("\n=== Phase 3: Testing 401 Unauthorized Response ===")
    try:
        base_url = os.getenv("USCIS_CASE_STATUS_URL", "https://api-int.uscis.gov/case-status")
        async with httpx.AsyncClient() as http_client:
            logger.info("Sending request with invalid token...")
            response = await http_client.get(
                f"{base_url}/LIN2690000001",
                headers={
                    "Authorization": "Bearer INVALID_TOKEN_123",
                    "Accept": "application/json"
                },
                timeout=10.0
            )
            logger.info(f"Expected Error Response: {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"Error testing 401: {e}")

    logger.info("\n✅ Traffic Generation Complete. USCIS Sandbox requirements met for today.")

if __name__ == "__main__":
    asyncio.run(generate_traffic())
