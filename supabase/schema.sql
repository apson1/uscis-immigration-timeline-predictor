-- Database Schema for Immigration Timeline Predictor

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL DEFAULT 'dev_user_1',
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    receipt_prefix VARCHAR(10),
    receipt_number_last4 VARCHAR(10),
    form_type VARCHAR(50), -- Nullable for receipt-only lookup
    service_center VARCHAR(100), -- Nullable for receipt-only lookup
    filed_date DATE, -- Nullable for receipt-only lookup
    current_status VARCHAR(255),
    current_status_date DATE,
    completed_date DATE, -- Populated when status transitions to approved/denied
    is_completed BOOLEAN DEFAULT FALSE,
    data_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'api', 'import', 'mock'
    data_confidence VARCHAR(50) DEFAULT 'Low', -- 'Low', 'Medium', 'High', 'Sandbox'
    last_sync_date TIMESTAMP DEFAULT NOW(),
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    concurrent_filing BOOLEAN DEFAULT FALSE,
    country_code VARCHAR(10) DEFAULT 'ROW',
    premium_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookup on receipt numbers and categorization
CREATE INDEX IF NOT EXISTS idx_cases_receipt_number ON cases(receipt_number);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_form_service ON cases(form_type, service_center);
CREATE INDEX IF NOT EXISTS idx_cases_prefix ON cases(receipt_prefix);
CREATE INDEX IF NOT EXISTS idx_cases_filed_date ON cases(filed_date);

-- Create milestones table to track status history transitions (backward compatibility)
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    milestone_type VARCHAR(100) NOT NULL, -- e.g., 'RECEIVED', 'BIOMETRICS', 'RFE_SENT', 'RFE_RESPONSE', 'APPROVED', 'DENIED'
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(case_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_milestones_case_id ON milestones(case_id);

-- Create case_status_snapshots table for detailed history
CREATE TABLE IF NOT EXISTS case_status_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    receipt_prefix VARCHAR(10),
    receipt_number_last4 VARCHAR(10),
    status_text VARCHAR(255),
    status_date DATE,
    http_status INTEGER,
    success BOOLEAN,
    source VARCHAR(50),
    raw_response JSONB,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_case_id ON case_status_snapshots(case_id);

-- Create case_events table to track events dynamically
CREATE TABLE IF NOT EXISTS case_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE,
    event_label VARCHAR(255),
    source VARCHAR(50) DEFAULT 'api',
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_case_id ON case_events(case_id);

-- Create sync_logs table for production integration audit evidence
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    receipt_prefix VARCHAR(10),
    receipt_number_last4 VARCHAR(10),
    http_status INTEGER,
    success BOOLEAN,
    response_time_ms NUMERIC,
    error_code VARCHAR(100),
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_checked_at ON sync_logs(checked_at);

-- Create predictions_summary table to cache the batch-calculated statistical survival curves
CREATE TABLE IF NOT EXISTS predictions_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_type VARCHAR(50) NOT NULL,
    service_center VARCHAR(100) NOT NULL,
    median_wait_days INTEGER,
    p25_wait_days INTEGER,
    p75_wait_days INTEGER,
    p90_wait_days INTEGER,
    survival_curve_json JSONB NOT NULL, -- Array of {days: X, probability: Y}
    cox_coefficients JSONB,             -- JSON object mapping covariates to their Cox hazard ratio weights
    baseline_curve_json JSONB,          -- Baseline survival curve S0(t) as an array of {days: X, probability: Y}
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(form_type, service_center)
);

CREATE INDEX IF NOT EXISTS idx_predictions_lookup ON predictions_summary(form_type, service_center);
