const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

export async function lookupReceipt(receiptNumber) {
  const response = await fetch(`${BACKEND_URL}/api/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ receipt_number: receiptNumber })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error_message || "Lookup failed.");
  }
  return data;
}

export async function listCases(userId = "dev_user_1") {
  const response = await fetch(`${BACKEND_URL}/api/cases?user_id=${userId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to list cases.");
  }
  return data;
}

export async function saveCase(caseData) {
  const response = await fetch(`${BACKEND_URL}/api/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(caseData)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to save case.");
  }
  return data;
}

export async function refreshCase(caseId) {
  const response = await fetch(`${BACKEND_URL}/api/cases/${caseId}/refresh`, {
    method: "POST"
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to refresh case.");
  }
  return data;
}

export async function importDetailedCase(userId, serviceCenter, payload) {
  const response = await fetch(`${BACKEND_URL}/api/cases/import-detailed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      service_center: serviceCenter,
      payload: payload
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to import case.");
  }
  return data;
}

export async function getPredictions(formType, serviceCenter) {
  const response = await fetch(`${BACKEND_URL}/api/predictions?form_type=${formType}&service_center=${serviceCenter}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch predictions.");
  }
  return data;
}

export async function triggerAnalytics() {
  const response = await fetch(`${BACKEND_URL}/api/analytics/trigger`, {
    method: "POST"
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to trigger analytics.");
  }
  return data;
}

export async function getGlobalAnalytics() {
  const response = await fetch(`${BACKEND_URL}/api/analytics/global`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch global analytics.");
  }
  return data;
}

export async function getSandboxTrafficSummary() {
  const response = await fetch(`${BACKEND_URL}/api/admin/sandbox-traffic-summary`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Failed to fetch sandbox traffic summary.");
  }
  return data;
}
