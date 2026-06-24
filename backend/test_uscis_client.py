import unittest
import asyncio
from uscis_client import USCISClient

class TestUSCISClient(unittest.TestCase):
    def setUp(self):
        self.client = USCISClient()
        # Force mock mode for reliable local testing
        self.client.client_id = None
        self.client.client_secret = None
        self.loop = asyncio.get_event_loop()

    def test_mock_fallback_valid_receipt(self):
        # We test fetch_case_status on SRC9999132719 which is in the mock DB
        res = self.loop.run_until_complete(self.client.fetch_case_status("SRC9999132719"))
        self.assertTrue(res["success"])
        self.assertEqual(res["http_status"], 200)
        self.assertEqual(res["receipt_number"], "SRC9999132719")
        self.assertEqual(res["current_status"], "Case Was Received")
        self.assertEqual(res["form_type"], "I-485")
        self.assertEqual(res["source"], "uscis_sandbox")

    def test_mock_fallback_invalid_receipt(self):
        # Test short/invalid receipt number format
        res = self.loop.run_until_complete(self.client.fetch_case_status("SRC123"))
        self.assertFalse(res["success"])
        self.assertEqual(res["http_status"], 400)

    def test_mock_fallback_not_found(self):
        # Test valid format but not found (using standard generator pattern ending in 0000)
        res = self.loop.run_until_complete(self.client.fetch_case_status("SRC2690000000"))
        self.assertFalse(res["success"])
        self.assertEqual(res["http_status"], 404)

if __name__ == "__main__":
    unittest.main()
