import os
import time
import logging
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class USCISClient:
    def __init__(self):
        self.client_id = os.getenv("USCIS_CLIENT_ID")
        self.client_secret = os.getenv("USCIS_CLIENT_SECRET")
        self.token_url = os.getenv("USCIS_TOKEN_URL", "https://api-int.uscis.gov/oauth/accesstoken")
        self.base_url = os.getenv("USCIS_CASE_STATUS_URL", "https://api-int.uscis.gov/case-status")
        
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0.0

    async def _get_access_token(self) -> str:
        """Obtains an access token using OAuth 2.0 Client Credentials flow."""
        current_time = time.time()
        
        # Check if cached token is still valid (with a 60-second buffer)
        if self.access_token and current_time < self.token_expiry - 60:
            return self.access_token

        if not self.client_id or not self.client_secret:
            raise ValueError("USCIS_CLIENT_ID and USCIS_CLIENT_SECRET must be set in environment variables.")

        logger.info("Requesting new USCIS Sandbox OAuth token...")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Failed to authenticate with USCIS: {response.status_code} - {response.text}")
                    response.raise_for_status()

                data = response.json()
                self.access_token = data["access_token"]
                # Set expiry (defaulting to 3599 seconds or whatever is returned in expires_in)
                expires_in = int(data.get("expires_in", 3600))
                self.token_expiry = current_time + expires_in
                
                logger.info("Successfully authenticated with USCIS Sandbox API.")
                return self.access_token
                
            except Exception as e:
                logger.error(f"Error fetching access token: {str(e)}")
                raise

    async def fetch_case_status(self, receipt_number: str) -> Dict[str, Any]:
        """Fetches the case status for a receipt number from the USCIS Sandbox API."""
        token = await self._get_access_token()
        
        url = f"{self.base_url}/{receipt_number}"
        logger.info(f"Fetching case status from USCIS Sandbox: {url}")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Accept": "application/json"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 404:
                    logger.warning(f"Case {receipt_number} not found in USCIS Sandbox.")
                    return {"error": "Case not found in Sandbox environment.", "receipt_number": receipt_number}
                    
                if response.status_code != 200:
                    logger.error(f"USCIS Case Status error {response.status_code}: {response.text}")
                    response.raise_for_status()
                
                return response.json()
                
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching case status: {e.response.status_code} - {e.response.text}")
                return {"error": f"USCIS API error: {e.response.status_code}", "detail": e.response.text}
            except Exception as e:
                logger.error(f"Unexpected error fetching case status: {str(e)}")
                return {"error": "Unexpected connection error.", "detail": str(e)}
