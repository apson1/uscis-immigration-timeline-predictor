import os
import logging
from datetime import datetime, date
import json
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from lifelines import KaplanMeierFitter
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("SUPABASE_URL and SUPABASE_KEY must be set in environment variables.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

def parse_date(date_str) -> Optional[date]:
    if not date_str:
        return None
    if isinstance(date_str, date) and not isinstance(date_str, datetime):
        return date_str
    if isinstance(date_str, datetime):
        return date_str.date()
    
    try:
        clean_str = str(date_str).replace('T', ' ').strip()
        date_part = clean_str.split(' ')[0]
        
        for fmt in ("%Y-%m-%d", "%m-%d-%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(date_part, fmt).date()
            except ValueError:
                continue
        logger.warning(f"No matching format found for date: {date_str}")
        return None
    except Exception as e:
        logger.warning(f"Failed to parse date: {date_str} - {str(e)}")
        return None

def run_survival_analysis() -> None:
    if not supabase:
        logger.error("Supabase client not initialized. Cannot run analytics.")
        return

    logger.info("Starting batch statistical survival analysis...")

    # 1. Fetch cases from Supabase
    try:
        response = supabase.table("cases").select(
            "id, form_type, service_center, filed_date, completed_date, current_status, concurrent_filing, country_code, premium_processed"
        ).execute()
        cases_data = response.data
    except Exception as e:
        logger.error(f"Error fetching cases from Supabase: {str(e)}")
        return

    if not cases_data:
        logger.info("No cases found in database to analyze.")
        return

    # Convert to DataFrame
    df = pd.DataFrame(cases_data)
    df['filed_date'] = df['filed_date'].apply(parse_date)
    df['completed_date'] = df['completed_date'].apply(parse_date)

    # Filter out rows with invalid filed_date
    df = df.dropna(subset=['filed_date'])
    if df.empty:
        logger.info("No cases with valid filing dates found.")
        return

    # Determine event indicators (E) and durations (T)
    durations = []
    events = []
    today = date.today()

    for idx, row in df.iterrows():
        filed = row['filed_date']
        completed = row['completed_date']
        status = str(row['current_status']).lower()
        
        # A case is completed if completed_date is set, or status indicates terminal state
        is_completed = (completed is not None) or ("approved" in status) or ("denied" in status)
        
        if is_completed:
            end_date = completed if completed else today
            # If the user completed it but the dates are equal or negative, set to 1 day
            days = (end_date - filed).days
            days = max(days, 1)
            durations.append(days)
            events.append(1)  # Event occurred (Approval/Decision)
        else:
            # Case is censored (still pending)
            days = (today - filed).days
            days = max(days, 1)
            durations.append(days)
            events.append(0)  # Event did not occur (right-censored)

    df['T'] = durations
    df['E'] = events

    # 2. Group by form_type and service_center
    grouped = df.groupby(['form_type', 'service_center'])

    for (form_type, service_center), group in grouped:
        # We need a minimum number of cases to compute a meaningful survival estimator
        if len(group) < 3:
            logger.info(f"Skipping {form_type} at {service_center} - insufficient cases ({len(group)}).")
            continue

        logger.info(f"Running survival curve for {form_type} at {service_center} with {len(group)} cases...")

        # Build clean dataframe for Cox Proportional Hazards and Kaplan-Meier
        fit_df = pd.DataFrame({
            'T': group['T'].values,
            'E': group['E'].values,
            'concurrent_filing': group['concurrent_filing'].fillna(False).astype(int).values,
            'premium_processed': group['premium_processed'].fillna(False).astype(int).values,
            'is_backlogged_country': group['country_code'].fillna('ROW').apply(
                lambda x: 1 if str(x).upper() in ('IN', 'CN', 'MX', 'PH') else 0
            ).values
        })

        try:
            # Fit Kaplan-Meier (standard overall completion curve)
            kmf = KaplanMeierFitter()
            kmf.fit(fit_df['T'].values, event_observed=fit_df['E'].values)
            
            # Extract cumulative completion probability (1 - survival probability)
            survival_df = kmf.survival_function_
            days = survival_df.index.tolist()
            probabilities = (1.0 - survival_df['KM_estimate']).tolist()
            
            # Sample to prevent oversized payloads
            curve_points = []
            max_days = int(max(days))
            interval = 5 if max_days < 100 else (10 if max_days < 500 else 30)
            sampled_days = list(range(0, max_days + 1, interval))
            if max_days not in sampled_days:
                sampled_days.append(max_days)
                
            for d in sampled_days:
                idx = np.abs(np.array(days) - d).argmin()
                prob = float(probabilities[idx])
                curve_points.append({"days": d, "probability": round(prob, 4)})

            # Calculate wait time percentiles
            median_days = None
            p25_days = None
            p75_days = None
            p90_days = None

            for pt in curve_points:
                p = pt["probability"]
                d = pt["days"]
                if p25_days is None and p >= 0.25:
                    p25_days = d
                if median_days is None and p >= 0.50:
                    median_days = d
                if p75_days is None and p >= 0.75:
                    p75_days = d
                if p90_days is None and p >= 0.90:
                    p90_days = d

            if median_days is None:
                median_days = int(kmf.median_survival_time_) if not np.isinf(kmf.median_survival_time_) else None

            # Now try Cox Proportional Hazards regression
            from lifelines import CoxPHFitter
            cox_coefficients = {
                "concurrent_filing": 0.0,
                "premium_processed": 0.0,
                "is_backlogged_country": 0.0
            }
            baseline_curve_points = curve_points  # Fallback: baseline is same as general KM curve

            try:
                # Identify columns with variance (nunique > 1) to avoid collinearity/singular matrix errors
                variates = ["concurrent_filing", "premium_processed", "is_backlogged_country"]
                active_variates = [col for col in variates if fit_df[col].nunique() > 1]

                if active_variates:
                    # Fit CPH model with L2 regularization (penalizer=0.1) to prevent complete separation failures
                    cph = CoxPHFitter(penalizer=0.1)
                    cph.fit(fit_df[['T', 'E'] + active_variates], duration_col='T', event_col='E')
                    
                    # Extract coefficients
                    params = cph.params_
                    for col in active_variates:
                        cox_coefficients[col] = float(params.get(col, 0.0))
                    
                    # Extract baseline survival curve S0(t)
                    baseline_sf = cph.baseline_survival_
                    b_days = baseline_sf.index.tolist()
                    col_name = baseline_sf.columns[0]
                    b_probabilities = (1.0 - baseline_sf[col_name]).tolist()
                    
                    baseline_curve_points = []
                    for d in sampled_days:
                        idx = np.abs(np.array(b_days) - d).argmin()
                        prob = float(b_probabilities[idx])
                        baseline_curve_points.append({"days": d, "probability": round(prob, 4)})
                        
                    logger.info(f"Successfully fit Cox Proportional Hazards for {form_type} at {service_center}. Coefficients: {cox_coefficients}")
                else:
                    logger.info(f"No active variates with variance for {form_type} at {service_center}. Skipping Cox fit.")
            except Exception as cph_ex:
                logger.warning(f"CoxPHFitter fit failed for {form_type} at {service_center} ({str(cph_ex)}). Falling back to Kaplan-Meier baseline.")

            # 3. Write / Update in predictions_summary
            record = {
                "form_type": form_type,
                "service_center": service_center,
                "median_wait_days": median_days,
                "p25_wait_days": p25_days,
                "p75_wait_days": p75_days,
                "p90_wait_days": p90_days,
                "survival_curve_json": curve_points,
                "cox_coefficients": cox_coefficients,
                "baseline_curve_json": baseline_curve_points,
                "updated_at": datetime.now().isoformat()
            }

            # Upsert into predictions_summary
            supabase.table("predictions_summary").upsert(
                record, 
                on_conflict="form_type,service_center"
            ).execute()
            
            logger.info(f"Upserted analytics cache for {form_type} at {service_center}. Median: {median_days} days.")

        except Exception as ex:
            logger.error(f"Error calculating curve for {form_type} - {service_center}: {str(ex)}")

    logger.info("Batch survival analysis pipeline completed successfully.")

if __name__ == "__main__":
    run_survival_analysis()
