import unittest
from receipt_utils import (
    normalize_receipt_number,
    validate_receipt_number,
    get_receipt_prefix,
    infer_service_center,
    get_receipt_numeric_sequence
)

class TestReceiptUtils(unittest.TestCase):
    def test_normalize_receipt_number(self):
        self.assertEqual(normalize_receipt_number("src9999132719"), "SRC9999132719")
        self.assertEqual(normalize_receipt_number("  src 9999 132719 "), "SRC9999132719")
        self.assertEqual(normalize_receipt_number(None), "")

    def test_validate_receipt_number(self):
        self.assertTrue(validate_receipt_number("SRC9999132719"))
        self.assertTrue(validate_receipt_number("src9999132719"))
        self.assertTrue(validate_receipt_number("  src 9999 132719 "))
        self.assertFalse(validate_receipt_number("SRC123"))
        self.assertTrue(validate_receipt_number("ABC9999999999"))
        self.assertFalse(validate_receipt_number(""))

    def test_get_receipt_prefix(self):
        self.assertEqual(get_receipt_prefix("SRC9999132719"), "SRC")
        self.assertEqual(get_receipt_prefix("  msc 1234567890 "), "MSC")

    def test_infer_service_center(self):
        self.assertEqual(infer_service_center("SRC9999132719"), "Texas Service Center")
        self.assertEqual(infer_service_center("LIN9999132719"), "Nebraska Service Center")
        self.assertEqual(infer_service_center("EAC9999132719"), "Vermont Service Center")
        self.assertEqual(infer_service_center("WAC9999132719"), "California Service Center")
        self.assertEqual(infer_service_center("MSC9999132719"), "National Benefits Center")
        self.assertEqual(infer_service_center("IOE9999132719"), "USCIS Electronic Immigration System")
        self.assertEqual(infer_service_center("XYZ9999132719"), "Unknown")

    def test_get_receipt_numeric_sequence(self):
        self.assertEqual(get_receipt_numeric_sequence("SRC9999132719"), "9999132719")

if __name__ == "__main__":
    unittest.main()
