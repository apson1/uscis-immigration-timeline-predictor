import re

RECEIPT_PREFIX_TO_CENTER = {
    "EAC": "Vermont Service Center",
    "LIN": "Nebraska Service Center",
    "MSC": "National Benefits Center",
    "SRC": "Texas Service Center",
    "WAC": "California Service Center",
    "IOE": "USCIS Electronic Immigration System"
}

def normalize_receipt_number(value: str) -> str:
    return str(value or "").strip().upper().replace(" ", "")

def validate_receipt_number(value: str) -> bool:
    normalized = normalize_receipt_number(value)
    return bool(re.match(r"^[A-Z]{3}[0-9]{10}$", normalized))

def get_receipt_prefix(value: str) -> str:
    return normalize_receipt_number(value)[:3]

def infer_service_center(value: str) -> str:
    prefix = get_receipt_prefix(value)
    return RECEIPT_PREFIX_TO_CENTER.get(prefix, "Unknown")

def get_receipt_numeric_sequence(value: str) -> str:
    return normalize_receipt_number(value)[3:]
