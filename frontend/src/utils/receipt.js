export const RECEIPT_PREFIX_TO_CENTER = {
  EAC: "Vermont Service Center",
  LIN: "Nebraska Service Center",
  MSC: "National Benefits Center",
  SRC: "Texas Service Center",
  WAC: "California Service Center",
  IOE: "USCIS Electronic Immigration System"
};

export function normalizeReceiptNumber(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function validateReceiptNumber(value) {
  const normalized = normalizeReceiptNumber(value);
  return /^[A-Z]{3}[0-9]{10}$/.test(normalized);
}

export function getReceiptPrefix(value) {
  return normalizeReceiptNumber(value).slice(0, 3);
}

export function inferServiceCenter(value) {
  return RECEIPT_PREFIX_TO_CENTER[getReceiptPrefix(value)] || "Unknown";
}

export function getReceiptNumericSequence(value) {
  return normalizeReceiptNumber(value).slice(3);
}
