-- Database Schema for Immigration Timeline Predictor

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_type VARCHAR(50) NOT NULL, -- e.g., 'I-485', 'I-130', 'I-765'
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    service_center VARCHAR(100), -- e.g., 'Texas Service Center', 'National Benefits Center'
    filed_date DATE NOT NULL,
    current_status VARCHAR(255) NOT NULL,
    last_sync_date TIMESTAMP DEFAULT NOW(),
    completed_date DATE -- Populated when status transitions to approved/denied
);

-- Index for quick lookup on receipt numbers and categorization
CREATE INDEX IF NOT EXISTS idx_cases_receipt_number ON cases(receipt_number);
CREATE INDEX IF NOT EXISTS idx_cases_form_service ON cases(form_type, service_center);

-- Create milestones table to track status history transitions
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    milestone_type VARCHAR(100) NOT NULL, -- e.g., 'RECEIVED', 'BIOMETRICS', 'RFE_SENT', 'RFE_RESPONSE', 'APPROVED', 'DENIED'
    event_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(case_id, milestone_type)
);

-- Index for timeline analysis
CREATE INDEX IF NOT EXISTS idx_milestones_case_id ON milestones(case_id);

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
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(form_type, service_center)
);

CREATE INDEX IF NOT EXISTS idx_predictions_lookup ON predictions_summary(form_type, service_center);
