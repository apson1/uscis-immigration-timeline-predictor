import unittest
from datetime import date, timedelta
import pandas as pd
import numpy as np
from lifelines import KaplanMeierFitter

# Import parsing helper directly from batch_analytics
from batch_analytics import parse_date

class TestImmigrationTimelinePredictor(unittest.TestCase):
    
    def setUp(self):
        # 1. Create simulated crowdsourced data
        # Form: I-485, Center: NBC
        # 10 cases total: 6 completed (Approved), 4 pending (Censored)
        self.today = date.today()
        
        self.mock_cases = [
            # Completed Cases (Approved)
            {"id": "1", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=200)), "completed_date": str(self.today - timedelta(days=50)), "current_status": "Case Approved"}, # 150 days
            {"id": "2", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=300)), "completed_date": str(self.today - timedelta(days=120)), "current_status": "Case Approved"}, # 180 days
            {"id": "3", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=250)), "completed_date": str(self.today - timedelta(days=30)), "current_status": "Case Approved"}, # 220 days
            {"id": "4", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=400)), "completed_date": str(self.today - timedelta(days=160)), "current_status": "Case Approved"}, # 240 days
            {"id": "5", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=350)), "completed_date": str(self.today - timedelta(days=50)), "current_status": "Case Approved"}, # 300 days
            {"id": "6", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=450)), "completed_date": str(self.today - timedelta(days=100)), "current_status": "Case Approved"}, # 350 days
            
            # Pending Cases (Right-Censored)
            {"id": "7", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=80)), "completed_date": None, "current_status": "Case Received"}, # 80 days pending
            {"id": "8", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=160)), "completed_date": None, "current_status": "Biometrics Taken"}, # 160 days pending
            {"id": "9", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=210)), "completed_date": None, "current_status": "RFE Response Review"}, # 210 days pending
            {"id": "10", "form_type": "I-485", "service_center": "NBC", "filed_date": str(self.today - timedelta(days=420)), "completed_date": None, "current_status": "Interview Scheduled"} # 420 days pending
        ]

    def test_date_parsing(self):
        parsed = parse_date("2026-06-03")
        self.assertEqual(parsed, date(2026, 6, 3))
        
        parsed_iso = parse_date("2026-06-03T12:00:00Z")
        self.assertEqual(parsed_iso, date(2026, 6, 3))
        
        self.assertIsNone(parse_date(None))

    def test_survival_analysis_computation(self):
        # Build DataFrame
        df = pd.DataFrame(self.mock_cases)
        df['filed_date'] = df['filed_date'].apply(parse_date)
        df['completed_date'] = df['completed_date'].apply(parse_date)
        
        # Calculate Durations & Events
        durations = []
        events = []
        
        for idx, row in df.iterrows():
            filed = row['filed_date']
            completed = row['completed_date']
            status = row['current_status'].lower()
            is_completed = (completed is not None) or ("approved" in status)
            
            if is_completed:
                end_date = completed if completed else self.today
                days = (end_date - filed).days
                durations.append(max(days, 1))
                events.append(1) # Approved
            else:
                days = (self.today - filed).days
                durations.append(max(days, 1))
                events.append(0) # Pending/Censored
                
        df['T'] = durations
        df['E'] = events
        
        # Run Kaplan-Meier Fitter
        kmf = KaplanMeierFitter()
        kmf.fit(df['T'].values, event_observed=df['E'].values)
        
        # Verify median wait time calculations
        median_wait = kmf.median_survival_time_
        self.assertIsNotNone(median_wait)
        self.assertFalse(np.isinf(median_wait))
        
        print(f"\n--- VERIFIED SURVIVAL METRICS ---")
        print(f"Calculated Median Wait Days: {median_wait} days")
        
        # Verify probability curves
        survival_df = kmf.survival_function_
        days = survival_df.index.tolist()
        completion_probs = (1.0 - survival_df['KM_estimate']).tolist()
        
        # Assertions
        self.assertEqual(days[0], 0)
        self.assertEqual(completion_probs[0], 0.0) # Day 0 has 0% chance of completion
        
        # Check percentiles
        p25_days = None
        p50_days = None
        p75_days = None
        
        for d, p in zip(days, completion_probs):
            if p25_days is None and p >= 0.25:
                p25_days = d
            if p50_days is None and p >= 0.50:
                p50_days = d
            if p75_days is None and p >= 0.75:
                p75_days = d
                
        print(f"25th Percentile: {p25_days} days")
        print(f"50th Percentile (Median): {p50_days} days")
        print(f"75th Percentile: {p75_days} days")
        
        self.assertTrue(p25_days <= p50_days)
        if p75_days:
            self.assertTrue(p50_days <= p75_days)
            
if __name__ == "__main__":
    unittest.main()
