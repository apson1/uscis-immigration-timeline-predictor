import unittest
from fastapi.testclient import TestClient
from main import app

class TestLookupEndpoint(unittest.TestCase):
    def setUp(self):
        # Force mock mode by clearing credentials on the global client
        from main import uscis
        uscis.client_id = None
        uscis.client_secret = None
        self.client = TestClient(app)

    def test_lookup_valid_receipt(self):
        # We look up SRC9999132719 which is in the mock client DB
        response = self.client.post("/api/lookup", json={"receipt_number": "SRC9999132719"})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["receipt_number"], "SRC9999132719")
        self.assertEqual(data["receipt_prefix"], "SRC")
        self.assertEqual(data["service_center_inferred"], "Texas Service Center")
        self.assertEqual(data["current_status"], "Case Was Received")
        self.assertEqual(data["data_source"], "uscis_sandbox")

    def test_lookup_invalid_receipt_format(self):
        response = self.client.post("/api/lookup", json={"receipt_number": "SRC123"})
        self.assertEqual(response.status_code, 400)

    def test_lookup_not_found(self):
        # Receipt format is valid but should return 404 in mock (using standard pattern ending in 0000)
        response = self.client.post("/api/lookup", json={"receipt_number": "SRC2690000000"})
        self.assertEqual(response.status_code, 404)

if __name__ == "__main__":
    unittest.main()
