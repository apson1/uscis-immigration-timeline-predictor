# USCIS Immigration Timeline Predictor

Applicants face massive, unpredictable processing delays. This full-stack web application aggregates immigration processing milestones, allowing applicants to track their cases in a dashboard, sync their steps with the official USCIS Sandbox Case Status API, and view predictive forecasting curves powered by crowdsourced community timelines.

This project showcases advanced software engineering, data analytics, and integration patterns, highlighting key backend, data modeling, and frontend UX design standards.

---

## ⚡ Tech Stack

* **Frontend**: React (Vite) + Vanilla CSS (Aesthetic glassmorphism, responsive dashboard layout).
* **Backend**: Python (FastAPI) + `lifelines` (survival analysis) + `httpx` (asynchronous REST requests).
* **Database**: Supabase (PostgreSQL) + Row-Level Security.
* **APIs**: USCIS Case Status API (OAuth 2.0 Client Credentials Flow over Sandbox).

---

## 📊 How the Timeline Predictor Model Works

Unlike simple averages (which are highly biased because they ignore pending cases that have been waiting a long time), this app uses **Survival Analysis** to predict wait times:

1. **Right-Censored Data Handling**: Cases that are still pending (active) are classified as *right-censored* (event has not occurred yet). Completed cases (Approved/Denied) are events.
2. **Kaplan-Meier Estimator**: The Python backend fits a Kaplan-Meier model using the `lifelines` package to calculate the probability of case completion $P(T \le t)$ at day $t$.
3. **Percentile Extraction**: The model extracts exact completion percentiles (25th, 50th/Median, 75th, 90th) to give applicants realistic estimations.
4. **Performance Cache**: A scheduled batch worker runs the calculations asynchronously and writes the results to a cache summary table, ensuring sub-second response times on the frontend.

---

## 📂 Project Structure

```text
├── backend/
│   ├── main.py              # FastAPI endpoints (Sync, Predictions, Analytics triggers)
│   ├── uscis_client.py      # OAuth 2.0 and Sandbox Case Status API client
│   ├── batch_analytics.py   # Statistical forecasting pipeline (Kaplan-Meier fitter)
│   ├── test_analytics.py    # Unit tests verifying analysis math
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── index.html           # Document SEO structure
│   ├── src/
│   │   ├── App.jsx          # React state, layouts, and custom SVG curves
│   │   ├── index.css        # Premium glassmorphic styling stylesheet
│   │   └── main.jsx         # React application mounting root
│   └── package.json         # Node frontend dependencies
├── supabase/
│   └── schema.sql           # Postgres database schema definition
└── README.md                # Documentation guide
```

---

## 🚀 Local Installation & Quickstart

### 1. Database Schema
Deploy the SQL schema in [supabase/schema.sql](./supabase/schema.sql) using your Supabase SQL Editor.

### 2. Configure Environment Variables
Copy `backend/.env.example` to `backend/.env` and enter your credentials:
```env
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_KEY=your-supabase-key
USCIS_CLIENT_ID=your_uscis_client_id
USCIS_CLIENT_SECRET=your_uscis_client_secret
```

### 3. Run the Backend Service
```bash
cd backend
pip install -r requirements.txt
python main.py
```
*The FastAPI server will start on `http://127.0.0.1:8000`.*

### 4. Run the Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*The Vite dashboard dev server will launch on `http://localhost:5173`.*

> **Note**: The web interface includes a **Demo Mode (Mock Database)** toggle in the top banner. You can test card sync features and interact with the SVG curves immediately without configuring any environment keys or database tables.
