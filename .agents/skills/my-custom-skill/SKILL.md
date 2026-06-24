---
name: uscis-case-status-tracker
description: Refactor the existing USCIS Timeline Predictor into an official USCIS Case Status API first tracker while preserving the current React, FastAPI, Supabase, USCIS Sandbox, JSON import, analytics, and forecasting work.
version: 1.0.0
category: full-stack-web-app
stack:
  frontend: React with Vite
  backend: FastAPI
  database: Supabase PostgreSQL
  api: USCIS Case Status API
primary_goal: Official USCIS receipt-number lookup, status tracking, Sandbox traffic evidence, and production-readiness.
preserve_existing_work: true
priority:
  - USCIS Case Status API lookup
  - Case save and refresh
  - Status history
  - Sandbox traffic logging
  - Production readiness
  - Optional forecasting
  - Optional analytics
required_behavior:
  - Never default a missing filing date to today.
  - Allow status lookup with receipt number only.
  - Require filing date, form type, service center, prediction data, and sufficient sample size before showing forecasts.
  - Keep USCIS credentials backend-only.
  - Clearly label Demo Mode as mock data.
  - Clearly label Sandbox Mode as staging data.
acceptance_test_receipt: SRC9999132719
---

# USCIS Case Status Tracker Skills Guide

## Purpose

Use this file as the capability guide for Antigravity while refactoring the current USCIS Timeline Predictor into a production-ready USCIS Case Status API web app.

The goal is not to throw away the existing project. The goal is to preserve the current frontend, backend, analytics, and Supabase structure while changing the product focus from a crowdsourced forecasting app into an official USCIS Case Status API tracker with optional timeline analytics.

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

## Product Direction

Build the app around the official USCIS Case Status API workflow:

1. User enters a USCIS receipt number.
2. Backend validates and normalizes the receipt number.
3. Backend requests a USCIS OAuth access token.
4. Backend queries the USCIS Case Status API.
5. Backend normalizes the API response.
6. Backend stores a status snapshot and sync log.
7. Frontend displays current status, timeline, and last checked time.
8. Forecasting remains optional and gated behind required data.

## Core Product Skills

### 1. Receipt Number Validation

Antigravity should preserve the current UI, but improve receipt-number handling.

Required skills:

- Normalize receipt numbers to uppercase.
- Remove spaces from user input.
- Validate receipt format.
- Extract receipt prefix.
- Infer likely service center from receipt prefix.
- Do not invent filing dates.
- Display missing-data prompts when filing date is unavailable.

Suggested receipt prefix mapping:

```js
const RECEIPT_PREFIX_TO_CENTER = {
  EAC: "Vermont Service Center",
  LIN: "Nebraska Service Center",
  MSC: "National Benefits Center",
  SRC: "Texas Service Center",
  WAC: "California Service Center",
  IOE: "USCIS Electronic Immigration System"
};
```

Validation rule:

```js
/^[A-Z]{3}[0-9]{10}$/
```

### 2. USCIS API Integration

The backend should remain the only layer that talks to USCIS.

Required skills:

- OAuth 2.0 client credentials flow.
- Secure environment variable loading.
- Async HTTP requests with `httpx`.
- Token caching when appropriate.
- Case Status API request handling.
- Response normalization.
- Error response normalization.
- Retry handling for transient failures.
- Request logging.
- Sandbox and Production environment separation.

Backend files to preserve and improve:

```text
backend/uscis_client.py
backend/main.py
backend/.env.example
```

### 3. FastAPI Backend Design

The current `backend/main.py` should remain the main API entry point, but route logic should become clearer.

Recommended endpoints:

```text
GET  /api/health
POST /api/lookup
POST /api/cases
GET  /api/cases
GET  /api/cases/{case_id}
POST /api/cases/{case_id}/refresh
POST /api/cases/sync
POST /api/cases/import-detailed
GET  /api/cases/{case_id}/timeline
GET  /api/predictions
POST /api/analytics/trigger
GET  /api/analytics/global
GET  /api/admin/sandbox-traffic-summary
```

Required backend capabilities:

- Accept receipt-number-first lookup.
- Return official USCIS status when available.
- Save a status snapshot for every lookup.
- Log both success and error responses.
- Preserve existing import-detailed workflow.
- Preserve existing analytics endpoints, but make forecasting optional.

### 4. Sandbox Traffic Compliance

The repo already contains:

```text
backend/sandbox_traffic_generator.py
backend/run_traffic_generator.bat
```

Antigravity should improve these files instead of replacing them.

Required skills:

- Generate repeatable Sandbox traffic.
- Test 200 responses.
- Test 4xx responses.
- Run for 5 consecutive calendar days.
- Store test logs.
- Summarize daily traffic.
- Avoid logging sensitive full receipt numbers unless necessary.

Recommended log fields:

```text
timestamp
environment
receipt_prefix
receipt_last4
http_status
success
response_time_ms
error_code
error_message
endpoint
```

### 5. Supabase Database Design

The current `supabase/schema.sql` should be extended, not discarded.

Required skills:

- PostgreSQL schema design.
- Row-Level Security.
- UUID primary keys.
- JSONB response storage.
- Indexes for lookup and dashboard speed.
- Sync logs for API testing evidence.
- Status snapshots for history tracking.

Core tables:

```text
profiles
cases
case_status_snapshots
case_events
sync_logs
prediction_cache
analytics_daily_activity
```

### 6. Frontend Refactor Skills

The current frontend is mostly inside:

```text
frontend/src/App.jsx
frontend/src/App.css
frontend/src/index.css
```

Antigravity should preserve the look and layout while splitting the app into smaller components.

Recommended component structure:

```text
frontend/src/components/ReceiptLookup.jsx
frontend/src/components/CaseSummaryCard.jsx
frontend/src/components/CaseStatusPanel.jsx
frontend/src/components/TimelinePanel.jsx
frontend/src/components/DataConfidenceBadge.jsx
frontend/src/components/MissingDataPrompt.jsx
frontend/src/components/SandboxModeBanner.jsx
frontend/src/components/ApiTrafficPanel.jsx
frontend/src/components/ForecastPanel.jsx
frontend/src/components/ImportJsonPanel.jsx
frontend/src/api/client.js
frontend/src/utils/receipt.js
frontend/src/utils/dates.js
frontend/src/utils/status.js
```

Required frontend behavior:

- Make receipt lookup the primary action.
- Keep Demo Mode, but label it as mock.
- Add Sandbox Mode language.
- Do not show a forecast if filing date is missing.
- Do not use today as a fake filing date.
- Show current status even when forecast data is unavailable.
- Show last checked timestamp.
- Show missing information clearly.

### 7. Forecasting Skills

Keep the existing analytics work, but demote it from core feature to optional feature.

Existing files to preserve:

```text
backend/batch_analytics.py
backend/test_analytics.py
```

Forecasting should require:

```text
form_type
service_center
filed_date
prediction data
sample_size >= 30
```

If these are missing, frontend should show:

```text
Forecast unavailable. Add filing date, form type, and service center to unlock timeline estimates.
```

Required analytics skills:

- Right-censored data handling.
- Kaplan-Meier fitting.
- Prediction cache creation.
- Confidence scoring.
- Small sample suppression.

### 8. JSON Import Skills

Preserve and improve the existing import feature.

Existing file:

```text
backend/test_import_endpoint.py
```

The import flow should support:

- my.uscis.gov raw JSON import.
- Extracting receipt number.
- Extracting form type.
- Extracting submission or receipt dates when present.
- Extracting evidence requests.
- Extracting notices.
- Extracting events.
- Extracting case history.
- Building normalized milestones.
- Updating an existing case without overwriting better data with nulls.

### 9. Privacy and Compliance Skills

The app should be production-aware from the beginning.

Required skills:

- Store API secrets only in backend environment variables.
- Never expose USCIS client credentials in React.
- Mask receipt numbers in logs.
- Store full receipt numbers only if needed.
- Prefer hashing or encryption for receipt numbers.
- Enable Row-Level Security.
- Add privacy policy and terms links.
- Add accessibility-friendly labels and contrast checks.

### 10. Testing Skills

Preserve existing tests and add new ones.

Existing tests:

```text
backend/test_analytics.py
backend/test_import_endpoint.py
```

New backend tests:

```text
backend/test_receipt_utils.py
backend/test_uscis_client.py
backend/test_lookup_endpoint.py
backend/test_sync_logs.py
backend/test_case_refresh.py
```

Frontend test targets:

```text
receipt validation
sandbox mode banner
missing filing date prompt
forecast gating
case status rendering
error state rendering
```

## Definition of Done

The app is ready for the next milestone when:

1. The user can enter a receipt number first.
2. The backend calls USCIS through `uscis_client.py`.
3. The app handles Sandbox 200 responses.
4. The app handles Sandbox 4xx responses.
5. The app logs API traffic for production access evidence.
6. The app has 5 consecutive days of traffic logs.
7. The app never defaults missing filing date to today.
8. The app can show current status without showing a forecast.
9. The app can save a case and refresh it later.
10. The existing prediction UI still works when required data exists.
11. Demo Mode is clearly labeled as mock.
12. Sandbox Mode is clearly labeled as staging data.
13. README explains Sandbox, Production, traffic logs, and forecast limitations.
