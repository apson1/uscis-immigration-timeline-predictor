# implementation_plan.md

# USCIS Case Status Tracker Implementation Plan

## Objective

Refactor the existing USCIS Timeline Predictor into a production-ready USCIS Case Status API tracker without discarding the current work.

The app should prioritize official USCIS Case Status API integration first. Forecasting and analytics should remain in the project, but they should become optional dashboard features that only appear when the required data exists.

## Current Repository Architecture

```text
.gitignore
README.md
backend/.env.example
backend/batch_analytics.py
backend/main.py
backend/requirements.txt
backend/run_traffic_generator.bat
backend/sandbox_traffic_generator.py
backend/test_analytics.py
backend/test_import_endpoint.py
backend/uscis_client.py
frontend/.gitignore
frontend/README.md
frontend/eslint.config.js
frontend/index.html
frontend/package-lock.json
frontend/package.json
frontend/public/favicon.svg
frontend/public/icons.svg
frontend/src/App.css
frontend/src/App.jsx
frontend/src/assets/hero.png
frontend/src/assets/react.svg
frontend/src/assets/vite.svg
frontend/src/index.css
frontend/src/main.jsx
frontend/vite.config.js
supabase/schema.sql
```

## Guiding Principle

Do not scratch the current project.

Preserve:

```text
React dashboard styling
Demo Mode
Sandbox traffic generator
USCIS client module
FastAPI backend
Supabase schema
JSON import work
Analytics work
Prediction charts
Tests already written
```

Change the order of importance:

1. Official USCIS status lookup
2. Case save and refresh
3. Status history
4. Sandbox traffic evidence
5. Production readiness
6. Optional forecasting
7. Optional analytics

## Phase 0: Create A Safety Branch

### Tasks

1. Create a new branch.

```bash
git checkout -b refactor/uscis-api-first
```

2. Commit the current working state before refactoring.

```bash
git add .
git commit -m "Checkpoint before USCIS API first refactor"
```

### Acceptance Criteria

- Current work is preserved.
- Refactor work happens on a separate branch.

## Phase 1: Fix The Filing Date Bug

### Problem

The frontend currently defaults missing filing date to today.

```js
const finalFiledDate = filedDate || new Date().toISOString().split('T')[0];
```

This makes Sandbox lookups and manually added cases appear to have been filed today when the filing date is unknown.

### Tasks

1. Open `frontend/src/App.jsx`.
2. Find all logic that uses today as a fallback for `filedDate`.
3. Remove the fallback for real or connected database workflows.
4. Allow status lookup with receipt number only.
5. Require filing date only for forecast and elapsed-days calculations.
6. Add a missing filing date message.

### Replacement Behavior

Use this rule:

```text
Case status lookup requires receipt number.
Timeline forecast requires filing date.
```

Suggested guard:

```js
if (needsForecast && !selectedCase?.filed_date) {
  return (
    <MissingDataPrompt
      title="Filing date required"
      message="Add the filing receipt date to unlock timeline estimates. Current case status can still be tracked without it."
    />
  );
}
```

### Acceptance Criteria

- `SRC9999132719` no longer receives today as its filing date unless the user explicitly enters today.
- Current status can display without a filing date.
- Forecasting is hidden when filing date is missing.

## Phase 2: Add Receipt Utility Module

### Goal

Move receipt parsing out of `App.jsx` and into a reusable utility.

### Tasks

1. Create `frontend/src/utils/receipt.js`.
2. Add receipt normalization.
3. Add receipt validation.
4. Add prefix extraction.
5. Add service center inference.
6. Add numeric sequence extraction.

### Implementation

```js
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
```

### Acceptance Criteria

- `SRC9999132719` validates.
- `SRC9999132719` infers Texas Service Center.
- Invalid input shows a useful error.
- Unknown prefixes do not break the UI.

## Phase 3: Add Backend Receipt Utility

### Goal

Validate receipt numbers on the backend too.

### Tasks

1. Create `backend/receipt_utils.py`.
2. Add the same normalization and validation behavior.
3. Add service center inference.
4. Add unit tests in `backend/test_receipt_utils.py`.

### Acceptance Criteria

- Backend rejects invalid receipt numbers.
- Backend returns prefix and inferred service center.
- Frontend and backend validation stay consistent.

## Phase 4: Improve `backend/uscis_client.py`

### Goal

Make the USCIS client production-ready while preserving the current file.

### Tasks

1. Keep `backend/uscis_client.py`.
2. Add a `USCISClient` class if one does not already exist.
3. Load configuration from environment variables.
4. Support Sandbox and Production base URLs through environment variables.
5. Implement OAuth token retrieval.
6. Cache token until close to expiry if token expiry is available.
7. Add `get_case_status(receipt_number)`.
8. Normalize success response.
9. Normalize error response.
10. Return structured results to `main.py`.

### Required Environment Variables

Update `backend/.env.example`:

```env
APP_ENV=sandbox
USCIS_CLIENT_ID=
USCIS_CLIENT_SECRET=
USCIS_TOKEN_URL=https://api-int.uscis.gov/oauth/accesstoken
USCIS_CASE_STATUS_BASE_URL=https://api-int.uscis.gov/case-status
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
```

### Suggested Response Shape

```python
{
    "success": True,
    "http_status": 200,
    "receipt_number": "SRC9999132719",
    "current_status": "Case Was Received",
    "current_status_date": None,
    "raw_response": {},
    "source": "uscis_sandbox"
}
```

Error shape:

```python
{
    "success": False,
    "http_status": 404,
    "receipt_number": "SRC9999132719",
    "error_code": "NOT_FOUND",
    "error_message": "Case status was not found for this receipt number.",
    "raw_response": {},
    "source": "uscis_sandbox"
}
```

### Acceptance Criteria

- OAuth token request works in Sandbox.
- Case status lookup works in Sandbox.
- Errors return structured results.
- No USCIS credentials appear in frontend files.

## Phase 5: Add `/api/lookup`

### Goal

Create a receipt-number-first backend endpoint.

### Tasks

1. Open `backend/main.py`.
2. Add request and response Pydantic models.
3. Add `POST /api/lookup`.
4. Validate receipt number.
5. Infer service center.
6. Call `USCISClient.get_case_status`.
7. Save a sync log.
8. Return a normalized lookup response.

### Request

```json
{
  "receipt_number": "SRC9999132719"
}
```

### Response

```json
{
  "receipt_number": "SRC9999132719",
  "receipt_prefix": "SRC",
  "service_center_inferred": "Texas Service Center",
  "success": true,
  "http_status": 200,
  "current_status": "Case Was Received",
  "current_status_date": null,
  "filed_date": null,
  "form_type": null,
  "data_source": "uscis_sandbox",
  "data_confidence": "Sandbox",
  "missing_fields": ["filed_date", "form_type"]
}
```

### Acceptance Criteria

- Frontend can analyze receipt number through backend.
- Lookup does not require filing date.
- Lookup does not invent filing date.
- Sync log is saved for each lookup attempt.

## Phase 6: Update Supabase Schema

### Goal

Extend `supabase/schema.sql` for status tracking and production evidence.

### Tasks

1. Keep existing useful schema objects.
2. Add or update `cases`.
3. Add `case_status_snapshots`.
4. Add `case_events`.
5. Add `sync_logs`.
6. Keep or update `prediction_cache`.
7. Add indexes.
8. Add Row-Level Security policies.

### Recommended SQL Additions

```sql
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'dev_user_1',
  receipt_number_hash text,
  receipt_number_last4 text,
  receipt_prefix text,
  form_type text,
  service_center text,
  filed_date date,
  current_status text,
  current_status_date date,
  completed_date date,
  is_completed boolean default false,
  data_source text default 'manual',
  data_confidence text default 'Low',
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists case_status_snapshots (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  receipt_prefix text,
  receipt_number_last4 text,
  status_text text,
  status_date date,
  http_status integer,
  success boolean,
  source text,
  raw_response jsonb,
  checked_at timestamptz default now()
);

create table if not exists case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references cases(id) on delete cascade,
  event_type text not null,
  event_date date,
  event_label text,
  source text default 'api',
  raw_payload jsonb,
  created_at timestamptz default now()
);

create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  endpoint text not null,
  receipt_prefix text,
  receipt_number_last4 text,
  http_status integer,
  success boolean,
  response_time_ms numeric,
  error_code text,
  error_message text,
  checked_at timestamptz default now()
);

create index if not exists idx_cases_user_id on cases(user_id);
create index if not exists idx_cases_prefix on cases(receipt_prefix);
create index if not exists idx_cases_form_center on cases(form_type, service_center);
create index if not exists idx_cases_filed_date on cases(filed_date);
create index if not exists idx_snapshots_case_id on case_status_snapshots(case_id);
create index if not exists idx_sync_logs_checked_at on sync_logs(checked_at);
```

### Acceptance Criteria

- Schema supports case saving.
- Schema supports snapshot history.
- Schema supports API traffic logs.
- Schema supports future forecasting cache.

## Phase 7: Add Case Save And Refresh

### Goal

Turn lookups into saved trackable cases.

### Tasks

1. Add `POST /api/cases`.
2. Add `GET /api/cases`.
3. Add `GET /api/cases/{case_id}`.
4. Add `POST /api/cases/{case_id}/refresh`.
5. Preserve existing `/api/cases/sync` if already used by the frontend.
6. Make `/api/cases/sync` call the same internal logic as refresh or lookup.

### Acceptance Criteria

- User can save a lookup as a case.
- User can refresh a saved case.
- Refresh creates a new status snapshot.
- Status change creates or updates a timeline event.

## Phase 8: Frontend API Client

### Goal

Move fetch logic out of `App.jsx`.

### Tasks

1. Create `frontend/src/api/client.js`.
2. Add functions for:

```text
lookupReceipt
listCases
saveCase
refreshCase
importDetailedCase
getPredictions
triggerAnalytics
getGlobalAnalytics
getSandboxTrafficSummary
```

### Example

```js
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
```

### Acceptance Criteria

- `App.jsx` has less direct fetch code.
- Backend URL uses Vite environment variable.
- API errors are handled consistently.

## Phase 9: Frontend Component Split

### Goal

Reduce the size and complexity of `App.jsx` without changing the visual identity.

### Tasks

Create these components:

```text
frontend/src/components/ReceiptLookup.jsx
frontend/src/components/SandboxModeBanner.jsx
frontend/src/components/CaseSummaryCard.jsx
frontend/src/components/CaseStatusPanel.jsx
frontend/src/components/TimelinePanel.jsx
frontend/src/components/MissingDataPrompt.jsx
frontend/src/components/DataConfidenceBadge.jsx
frontend/src/components/ForecastPanel.jsx
frontend/src/components/ImportJsonPanel.jsx
frontend/src/components/ApiTrafficPanel.jsx
```

### Component Responsibilities

`ReceiptLookup.jsx`

- Primary receipt number input.
- Validate format.
- Infer service center preview.
- Call `lookupReceipt`.

`SandboxModeBanner.jsx`

- Clearly explain Sandbox data.
- Explain that staging receipts are not live production receipts.

`CaseSummaryCard.jsx`

- Receipt number masked.
- Current status.
- Inferred service center.
- Data source.
- Last checked.

`MissingDataPrompt.jsx`

- Filing date missing.
- Form type missing.
- Forecast unavailable.

`ForecastPanel.jsx`

- Keep existing prediction chart logic.
- Only render when required data exists.

### Acceptance Criteria

- `App.jsx` still controls high-level state.
- UI keeps existing styling.
- Receipt lookup is the first visible user action.
- Forecast is no longer the main app experience.

## Phase 10: Improve Demo Mode And Sandbox Mode

### Goal

Avoid confusing mock data with official API data.

### Tasks

1. Keep Demo Mode.
2. Rename Demo Mode button text from `Sync Case Milestones` to `Add Mock Case`.
3. Add a Demo Mode banner.
4. Add a Sandbox Mode banner when connected to USCIS Sandbox.
5. Add `data_source` labels to cards.

### Recommended Labels

```text
Mock Demo Data
USCIS Sandbox Data
USCIS Production Data
Manual User Entry
Imported JSON
```

### Acceptance Criteria

- User can tell whether data is mock, sandbox, production, manual, or imported.
- Demo Mode no longer appears to perform an official USCIS lookup.

## Phase 11: Upgrade Sandbox Traffic Generator

### Goal

Use existing traffic generator files to document production access readiness.

### Existing Files

```text
backend/sandbox_traffic_generator.py
backend/run_traffic_generator.bat
```

### Tasks

1. Ensure generator calls the local backend endpoint, not USCIS directly unless explicitly configured.
2. Include valid Sandbox receipts.
3. Include invalid receipts to test 4xx handling.
4. Write logs to database `sync_logs` and optional local file.
5. Print daily summary.
6. Add command-line options:

```text
--days
--interval-minutes
--include-errors
--dry-run
```

### Test Receipts

Use a configurable list in code or environment.

```text
SRC9999132719
SRC9999132710
SRC9999102777
LIN9999106498
EAC9999103403
```

Invalid test examples:

```text
SRC123
ABC9999999999
SRC0000000000
```

### Acceptance Criteria

- Generator can run repeatedly for 5 consecutive calendar days.
- Logs show 200 and 4xx tests.
- Summary output can be used in the production access request.

## Phase 12: Admin Traffic Summary Endpoint

### Goal

Show proof of Sandbox testing inside the app.

### Tasks

1. Add `GET /api/admin/sandbox-traffic-summary`.
2. Return traffic grouped by date.
3. Include total requests, 200 count, 4xx count, error count, and average response time.
4. Add `ApiTrafficPanel.jsx` in frontend.

### Response Example

```json
{
  "environment": "sandbox",
  "days": [
    {
      "date": "2026-06-18",
      "total_requests": 12,
      "success_200": 8,
      "client_errors_4xx": 4,
      "server_errors_5xx": 0,
      "avg_response_time_ms": 214
    }
  ],
  "consecutive_days": 5,
  "ready_for_production_request": true
}
```

### Acceptance Criteria

- Admin panel shows whether 5 consecutive calendar days exist.
- 200 and 4xx responses are visible.
- No full receipt numbers are exposed.

## Phase 13: Preserve JSON Import

### Goal

Keep the deeper timeline feature as an enhancement.

### Tasks

1. Preserve `/api/cases/import-detailed`.
2. Move parsing logic into a backend helper if currently embedded in frontend.
3. Keep `backend/test_import_endpoint.py` passing.
4. Add update behavior for existing cases.
5. Avoid overwriting known fields with null imported fields.

### Acceptance Criteria

- JSON import still works.
- Imported milestones appear in timeline.
- Imported filing date can unlock forecasting.

## Phase 14: Preserve Forecasting As Optional

### Goal

Keep `batch_analytics.py`, `test_analytics.py`, and prediction UI, but gate it correctly.

### Tasks

1. Update prediction endpoint to return `has_data`, `sample_size`, and `confidence_label`.
2. Hide forecast when required case fields are missing.
3. Hide forecast when sample size is below 30.
4. Show clear reason when forecast is unavailable.
5. Keep existing charts for valid data.

### Required Frontend Gate

```js
const canShowForecast = Boolean(
  selectedCase?.form_type &&
  selectedCase?.service_center &&
  selectedCase?.filed_date &&
  predictionData?.has_data &&
  predictionData?.sample_size >= 30
);
```

### Acceptance Criteria

- Forecasting does not block the status-tracking app.
- No misleading forecast appears for unknown filing dates.
- Existing analytics tests still pass.

## Phase 15: Add Tests

### Backend Tests To Add

```text
backend/test_receipt_utils.py
backend/test_uscis_client.py
backend/test_lookup_endpoint.py
backend/test_sync_logs.py
backend/test_case_refresh.py
```

### Existing Tests To Preserve

```text
backend/test_analytics.py
backend/test_import_endpoint.py
```

### Required Test Cases

```text
SRC9999132719 validates
SRC9999132719 infers Texas Service Center
invalid receipt returns 422 or 400
lookup logs 200 response
lookup logs 4xx response
missing filing date does not become today
forecast hidden without filed_date
JSON import extracts known fields
analytics handles pending cases as censored
```

### Acceptance Criteria

- All existing tests pass.
- New tests pass.
- Filing date bug is covered by tests.

## Phase 16: Update README

### Goal

Make the project easy to understand for production access review and future development.

### Add These Sections

```text
Project Purpose
Current Architecture
Sandbox vs Production
USCIS API Setup
Environment Variables
Running Backend
Running Frontend
Running Sandbox Traffic Generator
Production Access Readiness Checklist
Case Lookup Flow
Status History Flow
JSON Import Flow
Forecasting Limitations
Privacy and Security
Accessibility Notes
Known Limitations
Roadmap
```

### Add Production Access Checklist

```text
Developer account created
Sandbox app registered
OAuth token flow tested
Sandbox lookup tested
200 responses tested
4xx responses tested
5 consecutive calendar days of API traffic completed
Traffic logs captured
Privacy policy drafted
Accessibility reviewed
Production request email prepared
```

### Acceptance Criteria

- README explains the official USCIS API-first direction.
- README explains that forecasts are optional.
- README explains how to run traffic generator.
- README explains how to request production access.

## Phase 17: Final Acceptance Test

Use this receipt:

```text
SRC9999132719
```

Expected behavior:

1. User enters receipt number first.
2. Frontend validates format.
3. Frontend shows inferred Texas Service Center.
4. Frontend calls backend `/api/lookup`.
5. Backend calls USCIS Sandbox through `uscis_client.py`.
6. Backend returns current status or structured error.
7. Backend writes sync log.
8. Frontend shows status and data source.
9. Frontend does not assign today as filing date.
10. Forecast remains hidden until filing date and form type exist.
11. Demo Mode remains available but labeled as mock.
12. Traffic summary shows 200 and 4xx tests after generator runs.

## Antigravity Master Prompt

Use this prompt in Antigravity:

```text
Refactor this USCIS Timeline Predictor repository into an official USCIS Case Status API first tracker without discarding the existing work.

Current repository architecture:
.gitignore
README.md
backend/.env.example
backend/batch_analytics.py
backend/main.py
backend/requirements.txt
backend/run_traffic_generator.bat
backend/sandbox_traffic_generator.py
backend/test_analytics.py
backend/test_import_endpoint.py
backend/uscis_client.py
frontend/.gitignore
frontend/README.md
frontend/eslint.config.js
frontend/index.html
frontend/package-lock.json
frontend/package.json
frontend/public/favicon.svg
frontend/public/icons.svg
frontend/src/App.css
frontend/src/App.jsx
frontend/src/assets/hero.png
frontend/src/assets/react.svg
frontend/src/assets/vite.svg
frontend/src/index.css
frontend/src/main.jsx
frontend/vite.config.js
supabase/schema.sql

Do not scratch the existing app. Preserve the current React dashboard, FastAPI backend, USCIS client file, Sandbox traffic generator, Supabase schema, JSON import endpoint, analytics pipeline, prediction charts, and tests. Refactor the product flow so official USCIS case status lookup is the primary feature and forecasting becomes optional.

First fix the filing date bug. The app must never default a missing filing date to today. Status lookup should work with only a receipt number. Forecasting should require filing date, form type, service center, prediction data, and sufficient sample size.

Add receipt validation and prefix inference in both frontend and backend. SRC9999132719 should validate and infer Texas Service Center. Add POST /api/lookup in FastAPI. It should validate the receipt number, call backend/uscis_client.py, normalize success and error responses, write sync logs, and return current status without inventing filing date.

Improve backend/uscis_client.py to support OAuth client credentials, Sandbox and Production environment variables, structured success responses, structured 4xx error responses, and safe logging. Keep credentials backend-only.

Extend supabase/schema.sql to support cases, case_status_snapshots, case_events, sync_logs, and prediction_cache. Mask receipt numbers in logs and avoid exposing full receipt numbers in analytics.

Refactor frontend/src/App.jsx by extracting components into frontend/src/components and API helpers into frontend/src/api/client.js. Add ReceiptLookup, SandboxModeBanner, CaseSummaryCard, CaseStatusPanel, TimelinePanel, MissingDataPrompt, DataConfidenceBadge, ForecastPanel, ImportJsonPanel, and ApiTrafficPanel. Preserve the existing visual style.

Improve backend/sandbox_traffic_generator.py and backend/run_traffic_generator.bat so I can run 5 consecutive calendar days of Sandbox traffic. The generator should test both 200 and 4xx responses and store logs. Add an admin traffic summary endpoint and frontend panel to show readiness evidence.

Keep backend/batch_analytics.py and backend/test_analytics.py, but make forecasting optional and gated. Keep backend/test_import_endpoint.py and preserve JSON import behavior.

Final expected behavior: entering SRC9999132719 validates the receipt number, infers Texas Service Center, calls the USCIS Sandbox through the backend, displays current status or a structured API error, writes a sync log, does not assign today as filing date, and hides forecasting until required data exists. Demo Mode remains available but is clearly labeled as mock data.
```
