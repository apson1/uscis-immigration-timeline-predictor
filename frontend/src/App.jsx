/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { 
  Clock, 
  Database, 
  RefreshCw, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Activity, 
  TrendingUp, 
  ShieldAlert,
  Moon,
  Sun,
  Share2,
  Bell,
  Search
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { COUNTRY_MAP as COUNTRY_METADATA } from './countries';

// Import our new components
import SandboxModeBanner from './components/SandboxModeBanner';
import DataConfidenceBadge from './components/DataConfidenceBadge';
import MissingDataPrompt from './components/MissingDataPrompt';
import ReceiptLookup from './components/ReceiptLookup';
import CaseSummaryCard from './components/CaseSummaryCard';
import CaseStatusPanel from './components/CaseStatusPanel';
import TimelinePanel from './components/TimelinePanel';
import ForecastPanel from './components/ForecastPanel';
import ImportJsonPanel from './components/ImportJsonPanel';
import ApiTrafficPanel from './components/ApiTrafficPanel';

// Import API client functions
import * as api from './api/client';
import { validateReceiptNumber, normalizeReceiptNumber, inferServiceCenter } from './utils/receipt';

// Setup environment URLs (FastAPI backend)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';


// Mock Data for instant premium visualization in Demo Mode
const MOCK_CASES = [
  {
    id: 'case-1',
    form_type: 'I-485',
    receipt_number: 'MSC2690184719', // Mock NBC receipt
    service_center: 'National Benefits Center',
    filed_date: '2025-10-15',
    current_status: 'Case Was Approved',
    completed_date: '2026-05-10',
    last_sync_date: '2026-06-03T12:00:00Z',
    concurrent_filing: true,
    premium_processed: false,
    country_code: 'IN',
    milestones: [
      { milestone_type: 'RECEIVED', event_date: '2025-10-15' },
      { milestone_type: 'BIOMETRICS', event_date: '2025-11-20' },
      { milestone_type: 'RFE_SENT', event_date: '2026-02-14' },
      { milestone_type: 'RFE_RESPONSE', event_date: '2026-03-05' },
      { milestone_type: 'APPROVED', event_date: '2026-05-10' }
    ]
  },
  {
    id: 'case-2',
    form_type: 'I-765',
    receipt_number: 'MSC2690189472',
    service_center: 'National Benefits Center',
    filed_date: '2026-03-10',
    current_status: 'Biometrics Appointment Scheduled',
    completed_date: null,
    last_sync_date: '2026-06-03T12:00:00Z',
    concurrent_filing: false,
    premium_processed: true,
    country_code: 'ROW',
    milestones: [
      { milestone_type: 'RECEIVED', event_date: '2026-03-10' },
      { milestone_type: 'BIOMETRICS', event_date: '2026-04-12' }
    ]
  },
  {
    id: 'case-3',
    form_type: 'I-130',
    receipt_number: 'SRC2690274819', // Mock Texas Service Center
    service_center: 'Texas Service Center',
    filed_date: '2025-08-01',
    current_status: 'Request for Additional Evidence Sent',
    completed_date: null,
    last_sync_date: '2026-06-03T12:00:00Z',
    concurrent_filing: false,
    premium_processed: false,
    country_code: 'MX',
    milestones: [
      { milestone_type: 'RECEIVED', event_date: '2025-08-01' },
      { milestone_type: 'RFE_SENT', event_date: '2026-01-20' }
    ]
  }
];

const MOCK_PREDICTIONS = {
  'I-485': {
    'National Benefits Center': {
      form_type: 'I-485',
      service_center: 'National Benefits Center',
      median_wait_days: 210,
      p25_wait_days: 135,
      p75_wait_days: 285,
      p90_wait_days: 350,
      cox_coefficients: {
        concurrent_filing: -0.15,
        premium_processed: 0.0,
        is_backlogged_country: -0.35
      },
      baseline_curve_json: [
        { days: 0, probability: 0.0 },
        { days: 30, probability: 0.02 },
        { days: 60, probability: 0.08 },
        { days: 90, probability: 0.15 },
        { days: 120, probability: 0.22 },
        { days: 150, probability: 0.32 },
        { days: 180, probability: 0.44 },
        { days: 210, probability: 0.52 },
        { days: 240, probability: 0.65 },
        { days: 270, probability: 0.73 },
        { days: 300, probability: 0.81 },
        { days: 330, probability: 0.88 },
        { days: 360, probability: 0.93 },
        { days: 400, probability: 0.98 }
      ],
      survival_curve_json: [
        { days: 0, probability: 0.0 },
        { days: 30, probability: 0.02 },
        { days: 60, probability: 0.08 },
        { days: 90, probability: 0.15 },
        { days: 120, probability: 0.22 },
        { days: 150, probability: 0.32 },
        { days: 180, probability: 0.44 },
        { days: 210, probability: 0.52 },
        { days: 240, probability: 0.65 },
        { days: 270, probability: 0.73 },
        { days: 300, probability: 0.81 },
        { days: 330, probability: 0.88 },
        { days: 360, probability: 0.93 },
        { days: 400, probability: 0.98 }
      ]
    }
  },
  'I-765': {
    'National Benefits Center': {
      form_type: 'I-765',
      service_center: 'National Benefits Center',
      median_wait_days: 62,
      p25_wait_days: 41,
      p75_wait_days: 85,
      p90_wait_days: 110,
      cox_coefficients: {
        concurrent_filing: 0.1,
        premium_processed: 1.8,
        is_backlogged_country: -0.2
      },
      baseline_curve_json: [
        { days: 0, probability: 0.0 },
        { days: 15, probability: 0.05 },
        { days: 30, probability: 0.18 },
        { days: 45, probability: 0.32 },
        { days: 60, probability: 0.48 },
        { days: 75, probability: 0.68 },
        { days: 90, probability: 0.82 },
        { days: 105, probability: 0.91 },
        { days: 120, probability: 0.97 },
        { days: 150, probability: 0.99 }
      ],
      survival_curve_json: [
        { days: 0, probability: 0.0 },
        { days: 15, probability: 0.05 },
        { days: 30, probability: 0.18 },
        { days: 45, probability: 0.32 },
        { days: 60, probability: 0.48 },
        { days: 75, probability: 0.68 },
        { days: 90, probability: 0.82 },
        { days: 105, probability: 0.91 },
        { days: 120, probability: 0.97 },
        { days: 150, probability: 0.99 }
      ]
    }
  },
  'I-130': {
    'Texas Service Center': {
      form_type: 'I-130',
      service_center: 'Texas Service Center',
      median_wait_days: 315,
      p25_wait_days: 220,
      p75_wait_days: 410,
      p90_wait_days: 520,
      cox_coefficients: {
        concurrent_filing: 0.05,
        premium_processed: 0.8,
        is_backlogged_country: -0.45
      },
      baseline_curve_json: [
        { days: 0, probability: 0.0 },
        { days: 60, probability: 0.01 },
        { days: 120, probability: 0.05 },
        { days: 180, probability: 0.12 },
        { days: 240, probability: 0.30 },
        { days: 300, probability: 0.46 },
        { days: 360, probability: 0.62 },
        { days: 420, probability: 0.78 },
        { days: 480, probability: 0.86 },
        { days: 540, probability: 0.92 },
        { days: 600, probability: 0.97 }
      ],
      survival_curve_json: [
        { days: 0, probability: 0.0 },
        { days: 60, probability: 0.01 },
        { days: 120, probability: 0.05 },
        { days: 180, probability: 0.12 },
        { days: 240, probability: 0.30 },
        { days: 300, probability: 0.46 },
        { days: 360, probability: 0.62 },
        { days: 420, probability: 0.78 },
        { days: 480, probability: 0.86 },
        { days: 540, probability: 0.92 },
        { days: 600, probability: 0.97 }
      ]
    }
  }
};

const MOCK_HEATMAP_DATA = [
  { month: "Jan 2025", wait_days: 180 },
  { month: "Feb 2025", wait_days: 210 },
  { month: "Mar 2025", wait_days: 245 },
  { month: "Apr 2025", wait_days: 220 },
  { month: "May 2025", wait_days: 200 },
  { month: "Jun 2025", wait_days: 190 },
  { month: "Jul 2025", wait_days: 175 },
  { month: "Aug 2025", wait_days: 160 },
  { month: "Sep 2025", wait_days: 155 },
  { month: "Oct 2025", wait_days: 180 },
  { month: "Nov 2025", wait_days: 230 },
  { month: "Dec 2025", wait_days: 250 }
];

const MOCK_GLOBAL_DATA = {
  nationalities: [
    { country_code: 'IN', approved_count: 85, pending_count: 120, avg_wait_days: 280.5 },
    { country_code: 'CN', approved_count: 55, pending_count: 75, avg_wait_days: 250.2 },
    { country_code: 'MX', approved_count: 42, pending_count: 35, avg_wait_days: 210.8 },
    { country_code: 'PH', approved_count: 30, pending_count: 40, avg_wait_days: 230.1 },
    { country_code: 'ROW', approved_count: 188, pending_count: 165, avg_wait_days: 175.4 }
  ],
  monthly_trends: [
    // I-485
    { month: '2025-10', form_type: 'I-485', count: 12, avg_wait_days: 195.0, median_wait_days: 190.0, p90_wait_days: 240.0 },
    { month: '2025-11', form_type: 'I-485', count: 18, avg_wait_days: 202.4, median_wait_days: 195.0, p90_wait_days: 245.0 },
    { month: '2025-12', form_type: 'I-485', count: 15, avg_wait_days: 215.1, median_wait_days: 210.0, p90_wait_days: 260.0 },
    { month: '2026-01', form_type: 'I-485', count: 24, avg_wait_days: 208.5, median_wait_days: 202.0, p90_wait_days: 250.0 },
    { month: '2026-02', form_type: 'I-485', count: 20, avg_wait_days: 220.0, median_wait_days: 215.0, p90_wait_days: 270.0 },
    { month: '2026-03', form_type: 'I-485', count: 32, avg_wait_days: 198.8, median_wait_days: 192.0, p90_wait_days: 235.0 },
    { month: '2026-04', form_type: 'I-485', count: 28, avg_wait_days: 190.2, median_wait_days: 185.0, p90_wait_days: 225.0 },
    { month: '2026-05', form_type: 'I-485', count: 45, avg_wait_days: 185.5, median_wait_days: 180.0, p90_wait_days: 220.0 },
    // I-765
    { month: '2025-10', form_type: 'I-765', count: 8, avg_wait_days: 72.0, median_wait_days: 70.0, p90_wait_days: 90.0 },
    { month: '2025-11', form_type: 'I-765', count: 14, avg_wait_days: 68.5, median_wait_days: 65.0, p90_wait_days: 85.0 },
    { month: '2025-12', form_type: 'I-765', count: 12, avg_wait_days: 65.0, median_wait_days: 62.0, p90_wait_days: 80.0 },
    { month: '2026-01', form_type: 'I-765', count: 16, avg_wait_days: 60.2, median_wait_days: 58.0, p90_wait_days: 75.0 },
    { month: '2026-02', form_type: 'I-765', count: 10, avg_wait_days: 58.0, median_wait_days: 55.0, p90_wait_days: 72.0 },
    { month: '2026-03', form_type: 'I-765', count: 19, avg_wait_days: 52.4, median_wait_days: 50.0, p90_wait_days: 68.0 },
    { month: '2026-04', form_type: 'I-765', count: 15, avg_wait_days: 48.0, median_wait_days: 45.0, p90_wait_days: 62.0 },
    { month: '2026-05', form_type: 'I-765', count: 25, avg_wait_days: 44.5, median_wait_days: 42.0, p90_wait_days: 58.0 },
    // I-130
    { month: '2025-10', form_type: 'I-130', count: 5, avg_wait_days: 320.0, median_wait_days: 310.0, p90_wait_days: 380.0 },
    { month: '2025-11', form_type: 'I-130', count: 7, avg_wait_days: 315.5, median_wait_days: 305.0, p90_wait_days: 375.0 },
    { month: '2025-12', form_type: 'I-130', count: 6, avg_wait_days: 322.0, median_wait_days: 312.0, p90_wait_days: 385.0 },
    { month: '2026-01', form_type: 'I-130', count: 9, avg_wait_days: 310.8, median_wait_days: 300.0, p90_wait_days: 370.0 },
    { month: '2026-02', form_type: 'I-130', count: 8, avg_wait_days: 298.0, median_wait_days: 288.0, p90_wait_days: 350.0 },
    { month: '2026-03', form_type: 'I-130', count: 12, avg_wait_days: 292.5, median_wait_days: 282.0, p90_wait_days: 345.0 },
    { month: '2026-04', form_type: 'I-130', count: 10, avg_wait_days: 285.0, median_wait_days: 275.0, p90_wait_days: 335.0 },
    { month: '2026-05', form_type: 'I-130', count: 15, avg_wait_days: 278.4, median_wait_days: 268.0, p90_wait_days: 328.0 }
  ],
  service_centers: [
    { service_center: 'National Benefits Center', form_type: 'I-485', approved_count: 150, pending_count: 210, avg_wait_days: 195.5 },
    { service_center: 'Texas Service Center', form_type: 'I-130', approved_count: 40, pending_count: 35, avg_wait_days: 310.2 },
    { service_center: 'California Service Center', form_type: 'I-485', approved_count: 65, pending_count: 80, avg_wait_days: 240.8 },
    { service_center: 'Nebraska Service Center', form_type: 'I-485', approved_count: 45, pending_count: 55, avg_wait_days: 220.1 }
  ],
  weekday_distribution: [
    { day: 'Monday', count: 48, percentage: 14.5 },
    { day: 'Tuesday', count: 64, percentage: 19.3 },
    { day: 'Wednesday', count: 83, percentage: 25.0 },
    { day: 'Thursday', count: 68, percentage: 20.5 },
    { day: 'Friday', count: 52, percentage: 15.7 },
    { day: 'Saturday', count: 9, percentage: 2.7 },
    { day: 'Sunday', count: 8, percentage: 2.4 }
  ]
};

const getAdjustedCurve = (predData, caseObj) => {
  if (!predData || !predData.baseline_curve_json) return null;
  if (!caseObj) return predData.survival_curve_json;
  
  const baseline = predData.baseline_curve_json;
  const coefs = predData.cox_coefficients || {};
  
  // Covariates Z
  const z_concurrent = caseObj.concurrent_filing ? 1 : 0;
  const z_premium = caseObj.premium_processed ? 1 : 0;
  const isBacklog = ['IN', 'CN', 'MX', 'PH'].includes(String(caseObj.country_code).toUpperCase());
  const z_backlog = isBacklog ? 1 : 0;
  
  // Coefficients beta
  const beta_concurrent = coefs.concurrent_filing || 0.0;
  const beta_premium = coefs.premium_processed || 0.0;
  const beta_backlog = coefs.is_backlogged_country || 0.0;
  
  const beta_sum = (beta_concurrent * z_concurrent) + (beta_premium * z_premium) + (beta_backlog * z_backlog);
  const exp_beta = Math.exp(beta_sum);
  
  return baseline.map(pt => {
    const S0 = Math.max(0, Math.min(1, 1.0 - pt.probability));
    const adjusted_p = 1.0 - Math.pow(S0, exp_beta);
    return {
      days: pt.days,
      probability: Math.max(0, Math.min(1, adjusted_p))
    };
  });
};

const getPercentileDays = (curve, pct) => {
  if (!curve || curve.length === 0) return null;
  const pt = curve.find(p => p.probability >= pct);
  return pt ? pt.days : null;
};

export default function App() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'predictions'
  const [activeView, setActiveView] = useState('tracker'); // 'tracker' or 'global'
  const [globalData, setGlobalData] = useState(null);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  
  // Theme Toggle Effect
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  // Fetch Global Analytics Data on mount / mode change
  useEffect(() => {
    setIsLoadingGlobal(true);
    if (isDemoMode) {
      setGlobalData(MOCK_GLOBAL_DATA);
      setIsLoadingGlobal(false);
    } else {
      fetch(`${BACKEND_URL}/api/analytics/global`)
        .then(res => {
          if (!res.ok) throw new Error("API failed");
          return res.json();
        })
        .then(data => {
          setGlobalData(data);
        })
        .catch(err => {
          console.error("Error fetching global analytics:", err);
          // Fallback
          setGlobalData(MOCK_GLOBAL_DATA);
        })
        .finally(() => {
          setIsLoadingGlobal(false);
        });
    }
  }, [isDemoMode]);



  // Request Notification Permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const notifyUser = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  const handleShareTimeline = async () => {
    const element = document.getElementById('timeline-capture-area');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: isLightMode ? '#f8fafc' : '#0b0c10',
        scale: 2
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `uscis-timeline-${selectedCase?.receipt_number || 'export'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture timeline', err);
    }
  };
  
  // State for user cases
  const [cases, setCases] = useState(MOCK_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState('case-2'); // default to pending I-765
  
  // Feed State
  const [feedItems, setFeedItems] = useState([
    "MSC2690... just got Approved!",
    "SRC2690... scheduled for Biometrics",
    "LIN2690... New Card Is Being Produced"
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses = ["Approved!", "scheduled for Biometrics", "New Card Is Being Produced", "Case Was Received", "RFE Sent"];
      const centers = ["MSC", "SRC", "LIN", "WAC", "EAC"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomCenter = centers[Math.floor(Math.random() * centers.length)];
      const id = `${randomCenter}${Math.floor(Math.random() * 90000) + 10000}...`;
      
      setFeedItems(prev => [`${id} ${randomStatus}`, ...prev].slice(0, 5));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Form State
  const [formType, setFormType] = useState('I-485');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [serviceCenter, setServiceCenter] = useState('National Benefits Center');
  const [filedDate, setFiledDate] = useState('');
  const [concurrentFiling, setConcurrentFiling] = useState(false);
  const [premiumProcessed, setPremiumProcessed] = useState(false);
  const [countryCode, setCountryCode] = useState('ROW');
  const [syncTab, setSyncTab] = useState('sandbox'); // 'sandbox' or 'import'
  const [rawJsonText, setRawJsonText] = useState('');
  
  // Loading & Error States
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active predictions data based on selected case
  const [predictionData, setPredictionData] = useState(null);
  const [compareServiceCenter, setCompareServiceCenter] = useState('');
  const [comparePredictionData, setComparePredictionData] = useState(null);
  const [chartTooltip, setChartTooltip] = useState({ x: 0, y: 0, content: '', visible: false });
  const [activeContinentTab, setActiveContinentTab] = useState('All');
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  const [queueInsights, setQueueInsights] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  // Sync queue insights whenever selected case changes
  useEffect(() => {
    if (!selectedCase) {
      setQueueInsights(null);
      return;
    }

    if (isDemoMode) {
      setIsLoadingQueue(true);
      const timer = setTimeout(() => {
        const receiptCode = selectedCase.receipt_number || "MSC2690000001";
        const codeSum = receiptCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // Compute elapsed days
        const start = new Date(selectedCase.filed_date);
        const end = selectedCase.completed_date ? new Date(selectedCase.completed_date) : new Date();
        const elapsedDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));

        // Standing rankings
        const pendingAhead = Math.max(0, Math.round(180 - (elapsedDays * 0.7) + (codeSum % 15)));
        const approvedBehind = Math.round(5 + (elapsedDays * 0.08) + (codeSum % 9));
        
        // Cohort statistics
        const cohortTotal = Math.round(150 + (codeSum % 40));
        const cohortApprovedPct = Math.min(100, Math.round(25 + (elapsedDays * 0.35) + (codeSum % 10)));
        const cohortApproved = Math.round((cohortApprovedPct / 100) * cohortTotal);
        
        // Average milestone transit times based on form type
        let avgBio = 35;
        let avgRfe = 110;
        let avgResp = 42;
        let avgDec = 210;

        if (selectedCase.form_type === 'I-765') {
          avgBio = 25;
          avgRfe = 50;
          avgResp = 20;
          avgDec = 75;
        } else if (selectedCase.form_type === 'I-130') {
          avgBio = 45;
          avgRfe = 160;
          avgResp = 55;
          avgDec = 320;
        }

        setQueueInsights({
          receipt_number: selectedCase.receipt_number,
          form_type: selectedCase.form_type,
          service_center: selectedCase.service_center,
          queue_position: pendingAhead + 1,
          pending_ahead: pendingAhead,
          approved_behind: approvedBehind,
          cohort_total: cohortTotal,
          cohort_approved: cohortApproved,
          cohort_approved_pct: cohortApprovedPct,
          averages: {
            received_to_biometrics: avgBio,
            received_to_rfe_sent: avgRfe,
            rfe_sent_to_response: avgResp,
            received_to_decision: avgDec
          },
          user_milestones: (selectedCase.milestones || []).map(m => m.milestone_type)
        });
        setIsLoadingQueue(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsLoadingQueue(true);
      fetch(`${BACKEND_URL}/api/cases/${selectedCase.receipt_number}/queue-insights`)
        .then(res => {
          if (!res.ok) throw new Error("Insights failed.");
          return res.json();
        })
        .then(data => {
          setQueueInsights(data);
        })
        .catch(err => {
          console.error("Error fetching queue insights:", err);
          // Fallback to local simulation if backend database fails or is unconfigured
          const receiptCode = selectedCase.receipt_number || "MSC2690000001";
          const codeSum = receiptCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const start = new Date(selectedCase.filed_date);
          const end = selectedCase.completed_date ? new Date(selectedCase.completed_date) : new Date();
          const elapsedDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));

          const pendingAhead = Math.max(0, Math.round(180 - (elapsedDays * 0.7) + (codeSum % 15)));
          const approvedBehind = Math.round(5 + (elapsedDays * 0.08) + (codeSum % 9));
          const cohortTotal = Math.round(150 + (codeSum % 40));
          const cohortApprovedPct = Math.min(100, Math.round(25 + (elapsedDays * 0.35) + (codeSum % 10)));
          const cohortApproved = Math.round((cohortApprovedPct / 100) * cohortTotal);
          
          let avgBio = 35; let avgRfe = 110; let avgResp = 42; let avgDec = 210;
          if (selectedCase.form_type === 'I-765') {
            avgBio = 25; avgRfe = 50; avgResp = 20; avgDec = 75;
          } else if (selectedCase.form_type === 'I-130') {
            avgBio = 45; avgRfe = 160; avgResp = 55; avgDec = 320;
          }

          setQueueInsights({
            receipt_number: selectedCase.receipt_number,
            form_type: selectedCase.form_type,
            service_center: selectedCase.service_center,
            queue_position: pendingAhead + 1,
            pending_ahead: pendingAhead,
            approved_behind: approvedBehind,
            cohort_total: cohortTotal,
            cohort_approved: cohortApproved,
            cohort_approved_pct: cohortApprovedPct,
            averages: {
              received_to_biometrics: avgBio,
              received_to_rfe_sent: avgRfe,
              rfe_sent_to_response: avgResp,
              received_to_decision: avgDec
            },
            user_milestones: (selectedCase.milestones || []).map(m => m.milestone_type)
          });
        })
        .finally(() => {
          setIsLoadingQueue(false);
        });
    }
  }, [selectedCaseId, cases, isDemoMode]);

  // Load cases when toggling Demo Mode or mounting
  useEffect(() => {
    if (isDemoMode) {
      setCases(MOCK_CASES);
      setSelectedCaseId('case-2');
      setCompareServiceCenter('');
    } else {
      setIsSyncing(true);
      setErrorMsg('');
      setSuccessMsg('');
      fetch(`${BACKEND_URL}/api/cases?user_id=dev_user_1`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCases(data);
            if (data.length > 0) {
              setSelectedCaseId(data[0].id);
            } else {
              setSelectedCaseId(null);
            }
          } else {
            setCases([]);
            setSelectedCaseId(null);
          }
          setCompareServiceCenter('');
        })
        .catch(err => {
          console.error("Error fetching cases:", err);
          setErrorMsg("Could not connect to database. Falling back to empty state.");
          setCases([]);
          setSelectedCaseId(null);
        })
        .finally(() => {
          setIsSyncing(false);
        });
    }
  }, [isDemoMode]);

  // Sync calculations whenever selected case changes
  useEffect(() => {
    if (!selectedCase) {
      setPredictionData(null);
      return;
    }

    if (isDemoMode) {
      // Fetch mock prediction curves
      const formPreds = MOCK_PREDICTIONS[selectedCase.form_type];
      const curve = formPreds ? formPreds[selectedCase.service_center] : null;
      setPredictionData(curve);
    } else {
      // Call backend API /api/predictions
      fetch(`${BACKEND_URL}/api/predictions?form_type=${selectedCase.form_type}&service_center=${selectedCase.service_center}`)
        .then(res => res.json())
        .then(data => {
          if (data.has_data) {
            setPredictionData(data);
          } else {
            setPredictionData(null);
          }
        })
        .catch(err => {
          console.error("Error fetching predictions from API:", err);
          // Fallback to mock in error
          const formPreds = MOCK_PREDICTIONS[selectedCase.form_type];
          const curve = formPreds ? formPreds[selectedCase.service_center] : null;
          setPredictionData(curve);
        });
    }
  }, [selectedCaseId, cases, isDemoMode]);

  // Sync comparison predictions whenever comparison service center or selected case changes
  useEffect(() => {
    if (!selectedCase || !compareServiceCenter) {
      setComparePredictionData(null);
      return;
    }

    if (isDemoMode) {
      const formPreds = MOCK_PREDICTIONS[selectedCase.form_type];
      const curve = formPreds ? formPreds[compareServiceCenter] : null;
      setComparePredictionData(curve);
    } else {
      fetch(`${BACKEND_URL}/api/predictions?form_type=${selectedCase.form_type}&service_center=${compareServiceCenter}`)
        .then(res => res.json())
        .then(data => {
          if (data.has_data) {
            setComparePredictionData(data);
          } else {
            setComparePredictionData(null);
          }
        })
        .catch(err => {
          console.error("Error fetching comparison predictions:", err);
          const formPreds = MOCK_PREDICTIONS[selectedCase.form_type];
          const curve = formPreds ? formPreds[compareServiceCenter] : null;
          setComparePredictionData(curve);
        });
    }
  }, [compareServiceCenter, selectedCase, isDemoMode]);

  const handleSaveCase = async (caseDetails) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSyncing(true);

    if (isDemoMode) {
      setTimeout(() => {
        const newId = `case-${Date.now()}`;
        const newCase = {
          id: newId,
          form_type: caseDetails.form_type,
          receipt_number: caseDetails.receipt_number.toUpperCase(),
          service_center: caseDetails.service_center,
          filed_date: caseDetails.filed_date || null,
          current_status: 'Case Was Received',
          completed_date: null,
          last_sync_date: new Date().toISOString(),
          concurrent_filing: caseDetails.concurrent_filing,
          premium_processed: caseDetails.premium_processed,
          country_code: caseDetails.country_code,
          milestones: caseDetails.filed_date ? [
            { milestone_type: 'RECEIVED', event_date: caseDetails.filed_date }
          ] : []
        };

        setCases([newCase, ...cases]);
        setSelectedCaseId(newId);
        setSuccessMsg(`Successfully synced mock Sandbox receipt ${newCase.receipt_number}!`);
        notifyUser('USCIS Update', `Mock case ${newCase.receipt_number} synced. Status: ${newCase.current_status}`);
        setIsSyncing(false);
      }, 1500);
    } else {
      try {
        const data = await api.saveCase({
          receipt_number: caseDetails.receipt_number.toUpperCase(),
          user_id: 'dev_user_1',
          form_type: caseDetails.form_type,
          service_center: caseDetails.service_center,
          filed_date: caseDetails.filed_date || null,
          concurrent_filing: caseDetails.concurrent_filing,
          premium_processed: caseDetails.premium_processed,
          country_code: caseDetails.country_code
        });

        const fetchedCase = data.case;
        const updatedCases = cases.filter(c => c.receipt_number !== fetchedCase.receipt_number);
        setCases([fetchedCase, ...updatedCases]);
        setSelectedCaseId(fetchedCase.id);
        
        setSuccessMsg(`Successfully connected to USCIS Sandbox. Sync complete!`);
        notifyUser('USCIS Update', `Case ${fetchedCase.receipt_number} synced. Status: ${fetchedCase.current_status}`);
        
        api.triggerAnalytics().catch(() => {});
      } catch (err) {
        setErrorMsg(err.message || 'API Connection refused. Ensure FastAPI server is running.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleUpdateCaseDetails = async (updatedCase) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSyncing(true);

    if (isDemoMode) {
      const updated = cases.map(c => c.id === updatedCase.id ? {
        ...c,
        ...updatedCase,
        milestones: updatedCase.filed_date ? [
          ...c.milestones.filter(m => m.milestone_type !== 'RECEIVED'),
          { milestone_type: 'RECEIVED', event_date: updatedCase.filed_date }
        ] : c.milestones.filter(m => m.milestone_type !== 'RECEIVED')
      } : c);
      setCases(updated);
      setSuccessMsg(`Successfully updated case details!`);
      setIsSyncing(false);
    } else {
      try {
        const data = await api.saveCase({
          receipt_number: updatedCase.receipt_number,
          user_id: updatedCase.user_id || 'dev_user_1',
          form_type: updatedCase.form_type,
          service_center: updatedCase.service_center,
          filed_date: updatedCase.filed_date || null,
          concurrent_filing: updatedCase.concurrent_filing,
          premium_processed: updatedCase.premium_processed,
          country_code: updatedCase.country_code
        });

        const fetchedCase = data.case;
        const updatedCases = cases.map(c => c.id === fetchedCase.id ? fetchedCase : c);
        setCases(updatedCases);
        setSuccessMsg(`Successfully updated case details!`);
        api.triggerAnalytics().catch(() => {});
      } catch (err) {
        setErrorMsg(err.message || 'Failed to update case.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleImportCase = async (importData) => {
    const { service_center, payload } = importData;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSyncing(true);

    if (isDemoMode) {
      setTimeout(() => {
        const dataObj = payload.data || payload;
        const receipt = dataObj.receiptNumber || dataObj.receipt_number || `IOE${Date.now()}`;
        const fType = dataObj.formType || dataObj.form_type || 'I-485';
        const sDate = dataObj.submissionDate || dataObj.submittedDate || dataObj.receiptDate || null;
        const newId = `case-${Date.now()}`;
        
        const milestoneMap = {};
        if (sDate) {
          milestoneMap["RECEIVED"] = sDate;
        }
        
        const evidenceReqs = dataObj.evidenceRequests || [];
        evidenceReqs.forEach(req => {
          const actionType = req.actionType;
          if (actionType === "Request for Evidence" || actionType === "Request for Additional Evidence") {
            const sentDate = req.generationDate || req.createdAt;
            if (sentDate) {
              milestoneMap["RFE_SENT"] = sentDate.split('T')[0];
            }
          }
          if (req.latestResponseDate) {
            milestoneMap["RFE_RESPONSE"] = req.latestResponseDate.split('T')[0];
          } else if (req.isRespondedTo || (req.responseCount || 0) > 0) {
            milestoneMap["RFE_RESPONSE"] = new Date().toISOString().split('T')[0];
          }
        });
        
        const notices = dataObj.notices || [];
        notices.forEach(n => {
          if (n.actionType === "Appointment Scheduled") {
            const apptDate = n.appointmentDateTime || n.generationDate;
            if (apptDate) {
              milestoneMap["BIOMETRICS"] = apptDate.split('T')[0];
            }
          }
        });
        
        const events = dataObj.events || [];
        events.forEach(e => {
          const code = e.eventCode;
          const evtDate = e.eventDateTime || e.createdAt || e.eventTimestamp;
          if (evtDate) {
            const cleanDate = evtDate.split('T')[0];
            if (code === "FTA0" || code === "IKA") {
              milestoneMap["BIOMETRICS"] = cleanDate;
            } else if (code === "HA") {
              milestoneMap["RFE_RESPONSE"] = cleanDate;
            } else if (["APPROVED", "APPR", "Approved", "Card Was Produced", "Case Approved"].includes(code)) {
              milestoneMap["APPROVED"] = cleanDate;
            } else if (["DENIED", "DENY", "Denied"].includes(code)) {
              milestoneMap["DENIED"] = cleanDate;
            }
          }
        });
        
        const history = dataObj.caseHistory || dataObj.caseActions || dataObj.history || [];
        history.forEach(item => {
          const actionDate = item.date || item.actionDate;
          const actionDesc = item.description || item.action || item.statusText;
          if (actionDate && actionDesc) {
            const cleanDate = actionDate.split('T')[0];
            const descLower = actionDesc.toLowerCase();
            if (descLower.includes("fingerprint") || descLower.includes("biometrics")) {
              milestoneMap["BIOMETRICS"] = cleanDate;
            } else if (descLower.includes("rfe") || descLower.includes("request for evidence")) {
              if (descLower.includes("received") || descLower.includes("response")) {
                milestoneMap["RFE_RESPONSE"] = cleanDate;
              } else {
                milestoneMap["RFE_SENT"] = cleanDate;
              }
            } else if (descLower.includes("approve")) {
              milestoneMap["APPROVED"] = cleanDate;
            } else if (descLower.includes("deny") || descLower.includes("reject")) {
              milestoneMap["DENIED"] = cleanDate;
            }
          }
        });
        
        const milestones = Object.keys(milestoneMap).map(type => ({
          milestone_type: type,
          event_date: milestoneMap[type]
        }));
        
        const caseStatusObj = dataObj.caseStatus || {};
        let statusText = caseStatusObj.statusText || dataObj.current_case_status_text_en || dataObj.status || "Unknown";
        
        if (statusText === "Unknown") {
          statusText = "Case Was Received";
          if (milestoneMap["APPROVED"]) {
            statusText = "Case Was Approved";
          } else if (milestoneMap["DENIED"]) {
            statusText = "Case Was Denied";
          } else if (milestoneMap["RFE_RESPONSE"]) {
            statusText = "Response To USCIS' Request For Evidence Was Received";
          } else if (milestoneMap["BIOMETRICS"]) {
            const bioDate = new Date(milestoneMap["BIOMETRICS"]);
            if (bioDate > new Date()) {
              statusText = "Biometrics Appointment Scheduled";
            } else {
              statusText = "Case Was Updated To Show Fingerprints Were Taken";
            }
          } else if (milestoneMap["RFE_SENT"]) {
            statusText = "Request for Additional Evidence Was Sent";
          }
        }
        
        const completedDate = milestoneMap["APPROVED"] || milestoneMap["DENIED"] || null;

        const newCase = {
          id: newId,
          form_type: fType,
          receipt_number: receipt.toUpperCase(),
          service_center: service_center,
          filed_date: sDate,
          current_status: statusText,
          completed_date: completedDate,
          last_sync_date: new Date().toISOString(),
          milestones: milestones
        };

        setCases([newCase, ...cases]);
        setSelectedCaseId(newId);
        setSuccessMsg(`Successfully imported mock case ${newCase.receipt_number}!`);
        notifyUser('USCIS Import', `Mock case ${newCase.receipt_number} imported successfully.`);
        setIsSyncing(false);
      }, 1500);
    } else {
      try {
        const data = await api.importDetailedCase('dev_user_1', service_center, payload);
        const fetchedCase = data.case;
        const updatedCases = cases.filter(c => c.receipt_number !== fetchedCase.receipt_number);
        setCases([fetchedCase, ...updatedCases]);
        setSelectedCaseId(fetchedCase.id);
        
        setSuccessMsg(`Successfully imported case ${fetchedCase.receipt_number} from my.uscis.gov JSON!`);
        notifyUser('USCIS Import', `Case ${fetchedCase.receipt_number} imported. Status: ${fetchedCase.current_status}`);
        api.triggerAnalytics().catch(() => {});
      } catch (err) {
        setErrorMsg(err.message || 'API Connection refused. Ensure FastAPI server is running.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleRefreshCase = async (caseIdOrObj) => {
    setIsSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetCase = typeof caseIdOrObj === 'string'
      ? cases.find(c => c.id === caseIdOrObj)
      : caseIdOrObj;

    if (!targetCase) {
      setErrorMsg('Case not found.');
      setIsSyncing(false);
      return;
    }

    if (isDemoMode) {
      setTimeout(() => {
        setSuccessMsg(`Mock Sandbox sync completed for ${targetCase.receipt_number}!`);
        setIsSyncing(false);
      }, 1000);
    } else {
      try {
        const data = await api.refreshCase(targetCase.id);
        const syncedCase = data.case;
        const updatedCases = cases.map(c => c.id === syncedCase.id ? syncedCase : c);
        setCases(updatedCases);
        setSuccessMsg(`Successfully synced Sandbox receipt ${syncedCase.receipt_number}!`);
        notifyUser('USCIS Update', `Case ${syncedCase.receipt_number} refreshed. Status: ${syncedCase.current_status}`);
        
        api.triggerAnalytics().catch(() => {});
      } catch (err) {
        setErrorMsg(err.message || 'API Connection error refreshing case.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Helper: calculate days elapsed
  const calculateDaysElapsed = (filedStr, completedStr) => {
    const start = new Date(filedStr);
    const end = completedStr ? new Date(completedStr) : new Date();
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Render status badge helper
  const renderStatusBadge = (statusText) => {
    const txt = statusText.toLowerCase();
    if (txt.includes('approved') || txt.includes('card was delivered') || txt.includes('mailed')) {
      return <span className="badge badge-approved">Approved</span>;
    } else if (txt.includes('rfe') || txt.includes('request for evidence') || txt.includes('additional evidence')) {
      return <span className="badge badge-rfe">RFE Alert</span>;
    } else if (txt.includes('biometrics') || txt.includes('fingerprint')) {
      return <span className="badge badge-biometrics">Biometrics</span>;
    } else if (txt.includes('denied') || txt.includes('reject')) {
      return <span className="badge badge-denied">Denied</span>;
    }
    return <span className="badge badge-received">Received</span>;
  };

  // Render SVG Kaplan-Meier Chart
  const renderSurvivalChart = () => {
    if (!predictionData || !predictionData.survival_curve_json || predictionData.survival_curve_json.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Activity size={48} style={{ marginBottom: '1rem', color: '#374151' }} />
          <p>No statistical model cached for this service center combination yet.</p>
          <button 
            onClick={async () => {
              if (!isDemoMode) {
                await fetch(`${BACKEND_URL}/api/analytics/trigger`, { method: 'POST' });
                alert("Analytics triggered! Refresh page in a few seconds.");
              }
            }} 
            className="btn btn-secondary" 
            style={{ marginTop: '1rem', width: 'auto', padding: '0.4rem 1rem' }}
          >
            Trigger Analytics Run
          </button>
        </div>
      );
    }

    const points = getAdjustedCurve(predictionData, selectedCase) || predictionData.survival_curve_json;
    const comparePoints = getAdjustedCurve(comparePredictionData, selectedCase) || comparePredictionData?.survival_curve_json || [];
    const baselinePoints = predictionData.baseline_curve_json || predictionData.survival_curve_json;
    const adjustedMedian = getPercentileDays(points, 0.50) || predictionData.median_wait_days;

    const maxDaysMain = points.length > 0 ? points[points.length - 1].days : 0;
    const maxDaysCompare = comparePoints.length > 0 ? comparePoints[comparePoints.length - 1].days : 0;
    const maxDays = Math.max(maxDaysMain, maxDaysCompare, 100);

    const height = 240;
    const width = 600;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Helper: Map days to X coordinate
    const getX = (d) => paddingLeft + (d / maxDays) * chartWidth;
    // Helper: Map probability (0.0 to 1.0) to Y coordinate
    const getY = (p) => paddingTop + chartHeight - p * chartHeight;

    // Build SVG Path string for Baseline Curve
    let baselinePathD = '';
    if (predictionData.baseline_curve_json && predictionData.baseline_curve_json.length > 0) {
      baselinePathD = `M ${getX(baselinePoints[0].days)} ${getY(baselinePoints[0].probability)}`;
      baselinePoints.forEach(pt => {
        baselinePathD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
      });
    }

    // Build SVG Path string for Main Curve
    let pathD = `M ${getX(points[0].days)} ${getY(points[0].probability)}`;
    let areaD = `M ${getX(points[0].days)} ${getY(0)}`; // Bottom left

    points.forEach(pt => {
      pathD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
      areaD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
    });

    areaD += ` L ${getX(points[points.length - 1].days)} ${getY(0)} Z`; // Close the polygon

    // Build SVG Path string for Comparison Curve
    let comparePathD = '';
    if (comparePoints.length > 0) {
      comparePathD = `M ${getX(comparePoints[0].days)} ${getY(comparePoints[0].probability)}`;
      comparePoints.forEach(pt => {
        comparePathD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
      });
    }

    // Calculate user's current position on the main curve
    const userDays = selectedCase ? calculateDaysElapsed(selectedCase.filed_date, selectedCase.completed_date) : 0;
    let userX = getX(userDays);
    if (userDays > maxDays) {
      userX = getX(maxDays);
    }

    // Find user's probability (closest day lookup on main curve)
    const closestPoint = points.reduce((prev, curr) => {
      return (Math.abs(curr.days - userDays) < Math.abs(prev.days - userDays) ? curr : prev);
    });
    const userProbY = getY(closestPoint.probability);

    return (
      <div className="chart-container" style={{ position: 'relative', height: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--secondary)" />
            </linearGradient>
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--bg-dark)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0.25, 0.5, 0.75, 1.0].map((tick, i) => (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={getY(tick)} 
                x2={width - paddingRight} 
                y2={getY(tick)} 
                className="chart-grid-line" 
              />
              <text x={paddingLeft - 10} y={getY(tick) + 4} textAnchor="end" className="chart-text">
                {tick * 100}%
              </text>
            </g>
          ))}

          {/* X Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
            const dayLabel = Math.round(ratio * maxDays);
            return (
              <text key={i} x={getX(dayLabel)} y={height - 10} textAnchor="middle" className="chart-text">
                {dayLabel}d
              </text>
            );
          })}

          {/* Y Axis line */}
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} className="chart-axis-line" />
          {/* X Axis line */}
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} className="chart-axis-line" />

          {/* Baseline Curve Line (dashed) */}
          {baselinePathD && (
            <path 
              d={baselinePathD} 
              fill="none" 
              stroke="var(--text-muted)" 
              strokeWidth="1.5" 
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Area & Main Curve Line */}
          <path d={areaD} className="chart-area" />
          <path d={pathD} className="chart-line" />

          {/* Comparison Curve Line */}
          {comparePathD && (
            <path 
              d={comparePathD} 
              fill="none" 
              stroke="var(--secondary)" 
              strokeWidth="2.5" 
              strokeDasharray="4 4"
              style={{ filter: 'drop-shadow(0 0 4px rgba(168, 85, 247, 0.4))' }}
            />
          )}

          {/* Median Wait Line indicator (Main Curve) */}
          {adjustedMedian && (
            <g>
              <line 
                x1={getX(adjustedMedian)} 
                y1={paddingTop} 
                x2={getX(adjustedMedian)} 
                y2={height - paddingBottom} 
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <text 
                x={getX(adjustedMedian) + 5} 
                y={paddingTop + 15} 
                fill="var(--primary)" 
                fontSize="0.75rem"
                fontWeight="600"
              >
                Median: {adjustedMedian}d
              </text>
            </g>
          )}

          {/* Median Wait Line indicator (Comparison Curve) */}
          {comparePredictionData && comparePredictionData.median_wait_days && (
            <g>
              <line 
                x1={getX(comparePredictionData.median_wait_days)} 
                y1={paddingTop} 
                x2={getX(comparePredictionData.median_wait_days)} 
                y2={height - paddingBottom} 
                stroke="var(--secondary)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <text 
                x={getX(comparePredictionData.median_wait_days) + 5} 
                y={paddingTop + 30} 
                fill="var(--secondary)" 
                fontSize="0.75rem"
                fontWeight="600"
              >
                Compare Median: {comparePredictionData.median_wait_days}d
              </text>
            </g>
          )}

          {/* User's Marker */}
          {selectedCase && (
            <g>
              {/* Vertical line representing User's timeline progress */}
              <line 
                x1={userX} 
                y1={userProbY} 
                x2={userX} 
                y2={height - paddingBottom} 
                stroke={isLightMode ? "var(--text-primary)" : "#fff"} 
                strokeWidth="1.5" 
                strokeDasharray="4 2"
              />
              <circle 
                cx={userX} 
                cy={userProbY} 
                r="6" 
                className="chart-marker"
                onMouseEnter={() => {
                  setChartTooltip({
                    x: userX,
                    y: userProbY - 35,
                    content: `Day ${userDays}: ${(closestPoint.probability * 100).toFixed(0)}% Approval Chance`,
                    visible: true
                  });
                }}
                onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
              />
              <text 
                x={userX + (userX > width - 100 ? -8 : 8)} 
                y={height - paddingBottom - 10} 
                textAnchor={userX > width - 100 ? "end" : "start"} 
                fill={isLightMode ? "var(--text-primary)" : "#fff"} 
                fontSize="0.8rem" 
                fontWeight="700"
              >
                You: {userDays}d
              </text>
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {chartTooltip.visible && (
          <div 
            className="chart-tooltip" 
            style={{ 
              display: 'block', 
              left: `${chartTooltip.x}px`, 
              top: `${chartTooltip.y}px`,
              transform: 'translateX(-50%)',
              transition: 'all 0.1s ease',
              zIndex: 10
            }}
          >
            {chartTooltip.content}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1.2rem', padding: '0.5rem 0', flexWrap: 'wrap', borderTop: '1px solid var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>
              {predictionData.service_center} (Adjusted)
            </span>
          </div>
          {predictionData.baseline_curve_json && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '0px', borderTop: '1.5px dashed var(--text-muted)' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>
                {predictionData.service_center} (Baseline)
              </span>
            </div>
          )}
          {comparePredictionData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '14px', height: '0px', borderTop: '2.5px dashed var(--secondary)' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>
                {comparePredictionData.service_center} (Comparison)
              </span>
            </div>
          )}
          {selectedCase && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '1px solid var(--text-primary)', borderRadius: '50%', background: 'var(--secondary)' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem', fontWeight: '500' }}>
                Your Progress ({userDays} days elapsed)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderQueueInsights = () => {
    if (isLoadingQueue) {
      return (
        <div style={{ display: 'flex', height: '240px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }} />
          <span>Crunching crowdsourced queue statistics...</span>
        </div>
      );
    }

    if (!queueInsights) {
      return (
        <div style={{ display: 'flex', height: '240px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <AlertCircle size={24} style={{ marginRight: '0.5rem' }} />
          <span>No queue insights available for this case type.</span>
        </div>
      );
    }

    const hasOutofOrderAlert = queueInsights.approved_behind > 3;
    const completedM = queueInsights.user_milestones || [];
    
    const hasReceived = completedM.includes("RECEIVED") || completedM.length > 0;
    const hasBio = completedM.includes("BIOMETRICS") || completedM.includes("APPROVED") || completedM.includes("DENIED");
    const hasRfe = completedM.includes("RFE_SENT");
    const hasRfeResp = completedM.includes("RFE_RESPONSE");
    const hasDecision = completedM.includes("APPROVED") || completedM.includes("DENIED");

    const steps = [
      { id: 'received', label: 'Case Received', completed: hasReceived, active: true, desc: 'Filing logged' },
      { 
        id: 'bio', 
        label: 'Biometrics', 
        completed: hasBio, 
        active: hasReceived,
        desc: `Median: ${queueInsights.averages.received_to_biometrics} days`
      },
      { 
        id: 'rfe', 
        label: 'RFE Status', 
        completed: hasRfeResp, 
        active: hasBio,
        desc: hasRfe ? (hasRfeResp ? 'Responded' : 'RFE Pending') : `Avg RFE: ${queueInsights.averages.received_to_rfe_sent}d` 
      },
      { 
        id: 'decision', 
        label: 'Final Decision', 
        completed: hasDecision, 
        active: hasBio && (!hasRfe || hasRfeResp),
        desc: `Median: ${queueInsights.averages.received_to_decision} days`
      }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {hasOutofOrderAlert && (
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.12)', 
            border: '1px solid var(--status-rfe)', 
            borderRadius: '12px', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.8rem'
          }}>
            <AlertCircle size={20} style={{ color: 'var(--status-rfe)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>Out-of-Order Approvals Warning</h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                We detected <strong>{queueInsights.approved_behind} cases</strong> filed <em>after</em> yours that have already been approved. 
                Your case is currently at position <strong>#{queueInsights.queue_position}</strong>. If your elapsed days exceed normal processing guidelines, consider filing an official inquiry.
              </p>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-value">#{queueInsights.queue_position}</div>
            <div className="stat-label">Estimated Queue Position</div>
          </div>
          <div className="stat-tile" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="stat-value">{queueInsights.pending_ahead}</div>
            <div className="stat-label">Cases Ahead of You</div>
          </div>
          <div className="stat-tile" style={{ borderLeft: '3px solid var(--status-rfe)' }}>
            <div className="stat-value">{queueInsights.approved_behind}</div>
            <div className="stat-label">Out-of-Order Approvals</div>
          </div>
          <div className="stat-tile" style={{ borderLeft: '3px solid var(--status-approved)' }}>
            <div className="stat-value">{queueInsights.cohort_approved_pct}%</div>
            <div className="stat-label">Cohort Resolved ({queueInsights.cohort_approved}/{queueInsights.cohort_total})</div>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: '500' }}>
            <span style={{ color: 'var(--text-primary)' }}>Filing Cohort Progress Rate</span>
            <span style={{ color: 'var(--text-muted)' }}>{queueInsights.cohort_approved_pct}% Resolved</span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${queueInsights.cohort_approved_pct}%`, background: 'linear-gradient(90deg, var(--primary) 0%, var(--status-approved) 100%)', borderRadius: '4px' }} />
          </div>
          <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block', lineHeight: '1.4' }}>
            Of the {queueInsights.cohort_total} tracked cases filed in the same month and year as yours at this center, {queueInsights.cohort_approved} have reached a final decision.
          </small>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1.2rem', fontFamily: 'var(--font-heading)' }}>Milestone Queue Progress</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', padding: '0 0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            {steps.map((step, idx) => {
              let transitDays = null;
              if (idx === 1) transitDays = queueInsights.averages.received_to_biometrics;
              if (idx === 2) transitDays = Math.max(0, queueInsights.averages.received_to_rfe_sent - queueInsights.averages.received_to_biometrics);
              if (idx === 3) transitDays = Math.max(0, queueInsights.averages.received_to_decision - queueInsights.averages.received_to_rfe_sent);

              return (
                <div key={step.id} style={{ display: 'flex', flex: idx > 0 ? '1 1 auto' : '0 0 auto', alignItems: 'center' }}>
                  {/* Transit Track Line & Days Badge */}
                  {idx > 0 && (
                    <div style={{ display: 'flex', flex: '1 1 auto', alignItems: 'center', justifyContent: 'center', minWidth: '40px', margin: '-16px 0.3rem 0 0.3rem', position: 'relative', zIndex: 1 }}>
                      <div style={{ height: '3px', background: step.active ? 'var(--primary)' : 'rgba(255,255,255,0.05)', width: '100%', borderRadius: '1.5px' }} />
                      <div style={{ 
                        position: 'absolute', 
                        top: '-10px', 
                        background: 'var(--bg-dark)', 
                        border: `1px solid ${step.active ? 'var(--primary)' : 'var(--border-card)'}`,
                        borderRadius: '10px', 
                        padding: '0.1rem 0.4rem', 
                        fontSize: '0.65rem', 
                        color: step.active ? 'var(--text-primary)' : 'var(--text-muted)', 
                        fontWeight: '700',
                        whiteSpace: 'nowrap',
                        boxShadow: step.active ? '0 0 8px rgba(99, 102, 241, 0.2)' : 'none'
                      }}>
                        +{transitDays}d
                      </div>
                    </div>
                  )}

                  {/* Step node */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '0 0 100px', zIndex: 2 }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: step.completed ? 'var(--status-approved)' : (step.active ? 'var(--primary)' : 'rgba(255,255,255,0.05)'),
                      border: `2px solid ${step.completed ? 'var(--status-approved)' : (step.active ? 'var(--primary)' : 'var(--border-card)')}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: step.completed || step.active ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: '700',
                      fontSize: '0.85rem',
                      marginBottom: '0.5rem',
                      boxShadow: step.active ? '0 0 10px rgba(99, 102, 241, 0.4)' : 'none',
                      transition: 'all 0.3s ease'
                    }}>
                      {step.completed ? '✓' : idx + 1}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: step.completed || step.active ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {step.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {step.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    // Determine active trends data
    let activeTrends = [];
    if (globalData && globalData.monthly_trends && selectedCase) {
      activeTrends = globalData.monthly_trends.filter(t => t.form_type === selectedCase.form_type);
    }
    
    // Fallback if no global data loaded or no matches
    if (activeTrends.length === 0) {
      // Map MOCK_HEATMAP_DATA format to match trends { month, avg_wait_days }
      activeTrends = MOCK_HEATMAP_DATA.map(d => ({
        month: d.month,
        avg_wait_days: d.wait_days,
        median_wait_days: d.wait_days,
        p90_wait_days: d.wait_days + 45,
        count: 15
      }));
    }

    const height = 180;
    const width = 580;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Use p90 for scaling max wait to avoid clipping
    const maxWait = Math.max(...activeTrends.map(t => t.p90_wait_days || (t.avg_wait_days * 1.35)), 150);
    const p50 = predictionData?.median_wait_days || 180;
    
    const getX = (idx) => paddingLeft + (idx / (activeTrends.length - 1)) * chartWidth;
    const getY = (days) => paddingTop + chartHeight - (days / maxWait) * chartHeight;

    // Draw paths for Median and P90
    // Median
    let linePathD = `M ${getX(0)} ${getY(activeTrends[0].median_wait_days || activeTrends[0].avg_wait_days)}`;
    let areaPathD = `M ${getX(0)} ${getY(0)} L ${getX(0)} ${getY(activeTrends[0].median_wait_days || activeTrends[0].avg_wait_days)}`;

    // P90
    let p90LinePathD = `M ${getX(0)} ${getY(activeTrends[0].p90_wait_days || (activeTrends[0].avg_wait_days * 1.35))}`;

    activeTrends.forEach((t, i) => {
      const medVal = t.median_wait_days || t.avg_wait_days;
      const p90Val = t.p90_wait_days || (t.avg_wait_days * 1.35);
      
      linePathD += ` L ${getX(i)} ${getY(medVal)}`;
      areaPathD += ` L ${getX(i)} ${getY(medVal)}`;
      p90LinePathD += ` L ${getX(i)} ${getY(p90Val)}`;
    });
    areaPathD += ` L ${getX(activeTrends.length - 1)} ${getY(0)} Z`;

    return (
      <div style={{ padding: '1.2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-heading)' }}>
          USCIS Processing Speed Trends ({selectedCase?.form_type || 'Active Case'})
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', lineHeight: '1.4' }}>
          Historical wait days by month. Solid line shows the <strong>Median (50%)</strong>; dashed line shows the <strong>P90 (90% tail-end)</strong> speed.
        </p>

        {/* SVG Line Chart */}
        <div style={{ position: 'relative', width: '100%', marginBottom: '1.5rem' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="tracker-trend-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--bg-dark)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0.25, 0.5, 0.75, 1.0].map((pct, i) => {
              const yVal = getY(pct * maxWait);
              return (
                <g key={i}>
                  <line 
                    x1={paddingLeft} 
                    y1={yVal} 
                    x2={width - paddingRight} 
                    y2={yVal} 
                    stroke="rgba(255,255,255,0.03)" 
                    strokeDasharray="4"
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={yVal + 3} 
                    textAnchor="end" 
                    fill="var(--text-muted)" 
                    fontSize="0.65rem"
                  >
                    {Math.round(pct * maxWait)}d
                  </text>
                </g>
              );
            })}

            {/* Axis Lines */}
            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="rgba(255,255,255,0.1)" />
            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.1)" />

            {/* Paths */}
            <path d={areaPathD} fill="url(#tracker-trend-grad)" />
            <path d={linePathD} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
            <path d={p90LinePathD} fill="none" stroke="var(--status-denied)" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" opacity="0.8" />

            {/* Data Points (Median) */}
            {activeTrends.map((t, i) => {
              const cx = getX(i);
              const medVal = t.median_wait_days || t.avg_wait_days;
              const p90Val = t.p90_wait_days || (t.avg_wait_days * 1.35);
              const cy = getY(medVal);
              const rawLabel = t.month || "";
              const label = rawLabel.includes('-') 
                ? rawLabel.split('-')[1] + '/' + rawLabel.split('-')[0].substring(2)
                : rawLabel.split(' ')[0].substring(0,3);

              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill="var(--bg-dark)"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => {
                      setChartTooltip({
                        x: cx,
                        y: cy - 30,
                        content: `${rawLabel}: Median ${Math.round(medVal)}d | P90 ${Math.round(p90Val)}d`,
                        visible: true
                      });
                    }}
                    onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
                  />
                  {/* X labels - show every alternate label if data is long */}
                  {(i % (activeTrends.length > 8 ? 2 : 1) === 0) && (
                    <text
                      x={cx}
                      y={height - 12}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="0.65rem"
                      fontWeight="500"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.2rem', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '3px', background: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Median Timeline (50%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '3px', borderBottom: '2.5px dashed var(--status-denied)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Severe Delay (P90)</span>
          </div>
        </div>

        {/* Small breakdown grid */}
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.8rem', fontWeight: '600' }}>Monthly Speed Analysis (Median / P90)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem' }}>
          {activeTrends.map((data, i) => {
            const med = data.median_wait_days || data.avg_wait_days;
            const p90 = data.p90_wait_days || (data.avg_wait_days * 1.35);
            
            let bg = 'rgba(16, 185, 129, 0.1)';
            let border = 'var(--status-approved)';
            if (med >= p50 * 1.2 || med >= 220) { 
              bg = 'rgba(239, 68, 68, 0.1)'; 
              border = 'var(--status-denied)'; 
            } else if (med >= p50 || med >= 180) { 
              bg = 'rgba(245, 158, 11, 0.1)'; 
              border = 'var(--status-rfe)'; 
            }
            
            return (
              <div key={i} style={{ padding: '0.5rem', background: bg, borderBottom: `2.5px solid ${border}`, borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{data.month}</div>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.2rem', fontSize: '0.75rem' }}>
                  {Math.round(med)}d / <span style={{ color: 'var(--text-secondary)' }}>{Math.round(p90)}d</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };


  const renderGlobalAnalytics = () => {
    if (isLoadingGlobal || !globalData) {
      return (
        <div style={{ display: 'flex', height: '400px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={48} className="spin" style={{ marginBottom: '1.2rem', animation: 'spin 1.5s linear infinite' }} />
          <span style={{ fontSize: '1rem', fontWeight: '500' }}>Aggregating crowdsourced statistics...</span>
        </div>
      );
    }

    const nationalities = (globalData.nationalities || []).filter(n => n.country_code !== 'ROW');
    const monthlyTrends = globalData.monthly_trends || [];
    const serviceCenters = globalData.service_centers || [];

    // Calculate Dynamic aggregates
    const totalApproved = nationalities.reduce((sum, n) => sum + (n.approved_count || 0), 0);
    const totalPending = nationalities.reduce((sum, n) => sum + (n.pending_count || 0), 0);
    const totalCases = totalApproved + totalPending;
    
    let weightedWaitSum = 0;
    let approvedWithWait = 0;
    nationalities.forEach(n => {
      if (n.avg_wait_days && n.approved_count) {
        weightedWaitSum += n.avg_wait_days * n.approved_count;
        approvedWithWait += n.approved_count;
      }
    });
    const avgWaitDays = approvedWithWait > 0 ? Math.round(weightedWaitSum / approvedWithWait) : 190;

    // Custom SVG Nationality stacked bar chart render (Top 5 only)
    const renderNationalityChart = () => {
      if (nationalities.length === 0) return null;

      // Filter and sort for Top 5 countries by volume
      const top5Nationalities = [...nationalities]
        .sort((a, b) => {
          const totalA = (a.approved_count || 0) + (a.pending_count || 0);
          const totalB = (b.approved_count || 0) + (b.pending_count || 0);
          return totalB - totalA;
        })
        .slice(0, 5);

      if (top5Nationalities.length === 0) return null;

      const width = 600;
      const rowHeight = 40;
      const paddingTop = 25;
      const paddingBottom = 15;
      const paddingLeft = 120;
      const paddingRight = 40;
      const height = paddingTop + paddingBottom + (top5Nationalities.length * rowHeight);

      const chartWidth = width - paddingLeft - paddingRight;

      // Find max total count of the top 5 to scale bars
      const maxTotal = Math.max(...top5Nationalities.map(n => (n.approved_count || 0) + (n.pending_count || 0)), 1);

      return (
        <div className="chart-container" style={{ height: 'auto', position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            {/* Gridlines */}
            {[0.25, 0.5, 0.75, 1.0].map((pct, i) => {
              const xVal = paddingLeft + pct * chartWidth;
              const gridLabel = Math.round(pct * maxTotal);
              return (
                <g key={i}>
                  <line 
                    x1={xVal} 
                    y1={paddingTop - 10} 
                    x2={xVal} 
                    y2={height - paddingBottom} 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeDasharray="3 3"
                  />
                  <text 
                    x={xVal} 
                    y={paddingTop - 15} 
                    textAnchor="middle" 
                    fill="var(--text-muted)" 
                    fontSize="0.7rem"
                  >
                    {gridLabel}
                  </text>
                </g>
              );
            })}

            {/* Render bars */}
            {top5Nationalities.map((nat, idx) => {
              const meta = COUNTRY_METADATA[nat.country_code] || { name: nat.country_code, flag: '🏳️' };
              const rowY = paddingTop + (idx * rowHeight);
              const barHeight = 22;

              const approvedWidth = ((nat.approved_count || 0) / maxTotal) * chartWidth;
              const pendingWidth = ((nat.pending_count || 0) / maxTotal) * chartWidth;
              const totalVal = (nat.approved_count || 0) + (nat.pending_count || 0);
              const approvalRate = totalVal > 0 ? Math.round(((nat.approved_count || 0) / totalVal) * 100) : 0;

              return (
                <g key={nat.country_code} className="bar-group">
                  {/* Country Code Label on Left */}
                  <text 
                    x={paddingLeft - 10} 
                    y={rowY + 15} 
                    textAnchor="end" 
                    fill="var(--text-primary)" 
                    fontWeight="600" 
                    fontSize="0.85rem"
                  >
                    {nat.country_code === 'ROW' ? 'Rest of World' : meta.name}
                  </text>

                  {/* Approved Bar Stack */}
                  {approvedWidth > 0 && (
                    <rect
                      x={paddingLeft}
                      y={rowY}
                      width={approvedWidth}
                      height={barHeight}
                      fill="var(--status-approved)"
                      rx={pendingWidth > 0 ? 0 : 3}
                      opacity="0.85"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        setChartTooltip({
                          x: paddingLeft + approvedWidth / 2,
                          y: rowY - 30,
                          content: `${meta.name}: ${nat.approved_count} Approved (${approvalRate}% Rate)`,
                          visible: true
                        });
                      }}
                      onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
                    />
                  )}

                  {/* Pending Bar Stack */}
                  {pendingWidth > 0 && (
                    <rect
                      x={paddingLeft + approvedWidth}
                      y={rowY}
                      width={pendingWidth}
                      height={barHeight}
                      fill="var(--status-received)"
                      rx={3}
                      opacity="0.75"
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => {
                        setChartTooltip({
                          x: paddingLeft + approvedWidth + pendingWidth / 2,
                          y: rowY - 30,
                          content: `${meta.name}: ${nat.pending_count} Pending`,
                          visible: true
                        });
                      }}
                      onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
                    />
                  )}

                  {/* Total Value text on Right */}
                  <text
                    x={paddingLeft + approvedWidth + pendingWidth + 8}
                    y={rowY + 15}
                    fill="var(--text-secondary)"
                    fontSize="0.75rem"
                    fontWeight="500"
                  >
                    {totalVal}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Chart Tooltip */}
          {chartTooltip.visible && (
            <div 
              className="chart-tooltip" 
              style={{ 
                display: 'block', 
                left: `${chartTooltip.x}px`, 
                top: `${chartTooltip.y}px`,
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
              {chartTooltip.content}
            </div>
          )}

          {/* Simple Chart Legend */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.8rem', padding: '0.4rem 0', fontSize: '0.75rem', borderTop: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--status-approved)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Approved</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--status-received)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Pending / Tracked</span>
            </div>
          </div>
        </div>
      );
    };

    // Custom SVG Processing Speed Trends Line Chart
    const renderTrendsChart = () => {
      // Filter monthly trends for I-485 as the reference form type
      const activeTrends = monthlyTrends.filter(t => t.form_type === 'I-485') || [];
      if (activeTrends.length === 0) {
        return (
          <div style={{ display: 'flex', height: '180px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <span>No historical trend records found in database.</span>
          </div>
        );
      }

      const height = 200;
      const width = 600;
      const paddingLeft = 40;
      const paddingRight = 20;
      const paddingTop = 20;
      const paddingBottom = 30;

      const chartWidth = width - paddingLeft - paddingRight;
      const chartHeight = height - paddingTop - paddingBottom;

      const maxWait = Math.max(...activeTrends.map(t => t.p90_wait_days || (t.avg_wait_days * 1.35)), 150);
      
      const getX = (idx) => paddingLeft + (idx / (activeTrends.length - 1)) * chartWidth;
      const getY = (days) => paddingTop + chartHeight - (days / maxWait) * chartHeight;

      // Draw paths for Median and P90
      let linePathD = `M ${getX(0)} ${getY(activeTrends[0].median_wait_days || activeTrends[0].avg_wait_days)}`;
      let areaPathD = `M ${getX(0)} ${getY(0)} L ${getX(0)} ${getY(activeTrends[0].median_wait_days || activeTrends[0].avg_wait_days)}`;

      let p90LinePathD = `M ${getX(0)} ${getY(activeTrends[0].p90_wait_days || (activeTrends[0].avg_wait_days * 1.35))}`;

      activeTrends.forEach((t, i) => {
        const medVal = t.median_wait_days || t.avg_wait_days;
        const p90Val = t.p90_wait_days || (t.avg_wait_days * 1.35);

        linePathD += ` L ${getX(i)} ${getY(medVal)}`;
        areaPathD += ` L ${getX(i)} ${getY(medVal)}`;
        p90LinePathD += ` L ${getX(i)} ${getY(p90Val)}`;
      });
      areaPathD += ` L ${getX(activeTrends.length - 1)} ${getY(0)} Z`;

      return (
        <div className="chart-container" style={{ height: 'auto', position: 'relative' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="trend-area-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--bg-dark)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {[0.25, 0.5, 0.75, 1.0].map((pct, i) => {
              const yVal = getY(pct * maxWait);
              return (
                <g key={i}>
                  <line 
                    x1={paddingLeft} 
                    y1={yVal} 
                    x2={width - paddingRight} 
                    y2={yVal} 
                    stroke="rgba(255,255,255,0.03)" 
                    strokeDasharray="4"
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={yVal + 3} 
                    textAnchor="end" 
                    fill="var(--text-muted)" 
                    fontSize="0.65rem"
                  >
                    {Math.round(pct * maxWait)}d
                  </text>
                </g>
              );
            })}

            {/* Axis Lines */}
            <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="rgba(255,255,255,0.1)" />
            <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="rgba(255,255,255,0.1)" />

            {/* Trend Area & Line */}
            <path d={areaPathD} fill="url(#trend-area-grad)" />
            <path d={linePathD} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
            <path d={p90LinePathD} fill="none" stroke="var(--status-denied)" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" opacity="0.8" />

            {/* Interactive Data Dots (Median) */}
            {activeTrends.map((t, i) => {
              const cx = getX(i);
              const medVal = t.median_wait_days || t.avg_wait_days;
              const p90Val = t.p90_wait_days || (t.avg_wait_days * 1.35);
              const cy = getY(medVal);
              const monthLabel = t.month.split('-')[1] + '/' + t.month.split('-')[0].substring(2);
              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill="var(--bg-dark)"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => {
                      setChartTooltip({
                        x: cx,
                        y: cy - 30,
                        content: `${t.month}: Median ${Math.round(medVal)}d | P90 ${Math.round(p90Val)}d (${t.count} cases)`,
                        visible: true
                      });
                    }}
                    onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
                  />
                  {/* X Axis Labels */}
                  <text
                    x={cx}
                    y={height - 12}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize="0.65rem"
                    fontWeight="500"
                  >
                    {monthLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {chartTooltip.visible && (
            <div 
              className="chart-tooltip" 
              style={{ 
                display: 'block', 
                left: `${chartTooltip.x}px`, 
                top: `${chartTooltip.y}px`,
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
              {chartTooltip.content}
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.8rem', padding: '0.4rem 0', fontSize: '0.75rem', borderTop: '1px solid var(--border-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', background: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Median (50%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '3px', borderBottom: '2.5px dashed var(--status-denied)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Severe Delay (P90)</span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Global KPIs Panel */}
        <div className="stats-grid">
          <div className="stat-tile" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div className="stat-value">{totalCases}</div>
            <div className="stat-label">Total Tracked Cases</div>
          </div>
          <div className="stat-tile" style={{ borderLeft: '4px solid var(--status-approved)' }}>
            <div className="stat-value">{totalApproved}</div>
            <div className="stat-label">Approved Milestones</div>
          </div>
          <div className="stat-tile" style={{ borderLeft: '4px solid var(--status-received)' }}>
            <div className="stat-value">{totalPending}</div>
            <div className="stat-label">Pending Timeline Cases</div>
          </div>
          <div className="stat-tile" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div className="stat-value">{avgWaitDays}d</div>
            <div className="stat-label">Global Average Wait Time</div>
          </div>
        </div>

        {/* Two-Column Analytics Layout */}
        <div className="global-grid">
          
          {/* Nationality Section */}
          <div className="glass-card">
            <h2 className="card-title">
              <Activity size={20} style={{ color: 'var(--primary)' }} />
              Nationality Approvals Distribution
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', lineHeight: '1.4' }}>
              Compare cumulative case approvals and pending queues across birth country chargeabilities. Hover over bars to see approval rates.
            </p>
            {renderNationalityChart()}

            {/* Detailed Table breakdown replaced with interactive searchable directory */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.8rem', borderTop: '1px solid var(--border-card)', paddingTop: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  All Tracked Chargeabilities
                </span>
                
                {/* Search Box */}
                <div style={{ maxWidth: '200px', width: '100%' }}>
                  <div className="country-search-wrapper">
                    <Search size={14} className="country-search-icon" />
                    <input
                      type="text"
                      placeholder="Search country..."
                      className="country-search-input"
                      value={countrySearchQuery}
                      onChange={(e) => setCountrySearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Continent Tabs */}
              <div className="continent-tabs" style={{ marginTop: '0.2rem' }}>
                {['All', 'Asia', 'Europe', 'Africa', 'North America', 'South America', 'Oceania'].map(tab => (
                  <button
                    key={tab}
                    className={`continent-tab-btn ${activeContinentTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveContinentTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Grid directory */}
              <div className="country-grid-container">
                {(() => {
                  const filtered = nationalities.filter(nat => {
                    const meta = COUNTRY_METADATA[nat.country_code] || { name: nat.country_code, flag: '🏳️', continent: 'Other' };
                    const searchLower = countrySearchQuery.toLowerCase().trim();
                    const matchesSearch = meta.name.toLowerCase().includes(searchLower) || nat.country_code.toLowerCase().includes(searchLower);
                    const matchesContinent = activeContinentTab === 'All' || meta.continent === activeContinentTab;
                    return matchesSearch && matchesContinent;
                  }).sort((a, b) => {
                    const totalA = (a.approved_count || 0) + (a.pending_count || 0);
                    const totalB = (b.approved_count || 0) + (b.pending_count || 0);
                    return totalB - totalA;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No chargeabilities match your filters.
                      </div>
                    );
                  }

                  return (
                    <div className="country-grid">
                      {filtered.map(nat => {
                        const meta = COUNTRY_METADATA[nat.country_code] || { name: nat.country_code, flag: '🏳️', continent: 'Other' };
                        const totalVal = (nat.approved_count || 0) + (nat.pending_count || 0);
                        const approvalRate = totalVal > 0 ? Math.round(((nat.approved_count || 0) / totalVal) * 100) : 0;
                        return (
                          <div key={nat.country_code} className="country-card">
                            {/* Wait Time Badge */}
                            {nat.avg_wait_days > 0 && (
                              <div className="country-card-wait" title="Average wait time">
                                {Math.round(nat.avg_wait_days)}d
                              </div>
                            )}

                            {/* Header: Flag + Code / Name */}
                            <div className="country-card-header" title={`${meta.name} (${nat.country_code})`}>
                              <span className="country-card-flag">{meta.flag}</span>
                              <span className="country-card-name">{meta.name}</span>
                            </div>

                            {/* Stats */}
                            <div className="country-card-stats">
                              <div className="country-card-stat">
                                <span className="country-card-stat-label">Approved</span>
                                <span className="country-card-stat-value" style={{ color: 'var(--status-approved)' }}>
                                  {nat.approved_count || 0}
                                </span>
                              </div>
                              <div className="country-card-stat">
                                <span className="country-card-stat-label">Pending</span>
                                <span className="country-card-stat-value" style={{ color: 'var(--status-received)' }}>
                                  {nat.pending_count || 0}
                                </span>
                              </div>
                              <div className="country-card-stat" style={{ textAlign: 'right' }}>
                                <span className="country-card-stat-label">Total</span>
                                <span className="country-card-stat-value">{totalVal}</span>
                              </div>
                            </div>

                            {/* Approval rate mini progress bar */}
                            <div className="country-card-progress-wrapper">
                              <div className="country-card-progress-bar">
                                <div className="country-card-progress-fill" style={{ width: `${approvalRate}%`, background: 'var(--status-approved)' }} />
                              </div>
                              <span className="country-card-rate">{approvalRate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Right Column: Processing Trends & Service Center Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Trends Section */}
            <div className="glass-card">
              <h2 className="card-title">
                <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
                USCIS Velocity: Recent Processing Trends
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', lineHeight: '1.4' }}>
                Median processing time (days) charted by approval month for <strong>I-485</strong> cases. Upward lines indicate delays; downward lines indicate speedups.
              </p>
              {renderTrendsChart()}
            </div>

            {/* Service Center Standings */}
            <div className="glass-card">
              <h2 className="card-title">
                <Layers size={20} style={{ color: 'var(--secondary)' }} />
                Service Center Performance Comparisons
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', lineHeight: '1.4' }}>
                Aggregate average processing times across different USCIS physical processing offices.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {serviceCenters.map((sc, idx) => {
                  const maxWaitCenter = Math.max(...serviceCenters.map(s => s.avg_wait_days), 320);
                  const barPct = (sc.avg_wait_days / maxWaitCenter) * 100;
                  
                  return (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '0.8rem 1rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-primary)' }}>{sc.service_center}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{sc.form_type}: <strong style={{ color: 'var(--text-primary)' }}>{sc.avg_wait_days}d</strong></span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${barPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--secondary) 0%, var(--primary) 100%)', borderRadius: '3px' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        <span>Approved: {sc.approved_count}</span>
                        <span>Pending: {sc.pending_count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  };


  return (
    <div className="app-container">
      {/* Top Banner Header */}
      <header className="header">
        <div className="logo-section">
          <h1>USCIS Timeline Predictor</h1>
          <p>Statistical processing forecasting powered by crowdsourced milestones</p>
        </div>
        
        {/* Header Actions */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div className="tab-nav" style={{ margin: 0, padding: '0.2rem', display: 'flex' }}>
            <button 
              className={`tab-btn ${activeView === 'tracker' ? 'active' : ''}`}
              onClick={() => setActiveView('tracker')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              My Case Tracker
            </button>
            <button 
              className={`tab-btn ${activeView === 'global' ? 'active' : ''}`}
              onClick={() => setActiveView('global')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Global Analytics
            </button>
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem', width: 'auto', borderRadius: '50%', height: '32px', minHeight: '32px' }}
            onClick={() => setIsLightMode(!isLightMode)}
            title="Toggle Light/Dark Mode"
          >
            {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          
          <button 
            className={`btn btn-secondary`} 
            style={{ 
              padding: '0.4rem 1rem', 
              fontSize: '0.8rem', 
              width: 'auto',
              borderColor: isDemoMode ? 'var(--status-rfe)' : 'var(--status-approved)',
              color: isDemoMode ? 'var(--status-rfe)' : 'var(--status-approved)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            onClick={() => setIsDemoMode(!isDemoMode)}
          >
            {isDemoMode ? <ShieldAlert size={14} /> : <Database size={14} />}
            {isDemoMode ? 'Demo Mode (Mock)' : 'Connected Database'}
          </button>
        </div>
      </header>

      <SandboxModeBanner isDemoMode={isDemoMode} />

      {/* Main Grid Workspace */}
      {activeView === 'tracker' ? (
        <div className="dashboard-grid">
        
        {/* LEFT COLUMN: Input Form & Case Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Case Integration tabs */}
          <div className="glass-card" style={{ padding: 0, border: 'none', background: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', borderRadius: '8px', padding: '0.6rem 1rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>Integration Method</span>
              <div className="tab-nav" style={{ margin: 0, padding: '0.2rem' }}>
                <button 
                  className={`tab-btn ${syncTab === 'sandbox' ? 'active' : ''}`}
                  onClick={() => { setSyncTab('sandbox'); setSuccessMsg(''); setErrorMsg(''); }}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  USCIS Lookup
                </button>
                <button 
                  className={`tab-btn ${syncTab === 'import' ? 'active' : ''}`}
                  onClick={() => { setSyncTab('import'); setSuccessMsg(''); setErrorMsg(''); }}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Import JSON
                </button>
              </div>
            </div>
            
            {syncTab === 'sandbox' ? (
              <ReceiptLookup
                onSave={handleSaveCase}
                isSyncing={isSyncing}
                errorMsg={errorMsg}
                successMsg={successMsg}
                isDemoMode={isDemoMode}
              />
            ) : (
              <ImportJsonPanel
                onImport={handleImportCase}
                isSyncing={isSyncing}
                errorMsg={errorMsg}
                successMsg={successMsg}
              />
            )}
          </div>

          {/* User Case List */}
          <div className="glass-card">
            <h2 className="card-title">
              <Layers size={20} style={{ color: 'var(--secondary)' }} />
              Active Tracked Cases
            </h2>
            
            <div className="case-list">
              {cases.map((c) => {
                const days = calculateDaysElapsed(c.filed_date, c.completed_date);
                const isActive = c.id === selectedCaseId;
                return (
                  <div 
                    key={c.id} 
                    className={`case-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      setSuccessMsg('');
                      setErrorMsg('');
                    }}
                  >
                    <div className="case-item-header">
                      <span className="case-item-title">{c.form_type} - {c.receipt_number}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        {renderStatusBadge(c.current_status)}
                        <button
                          className="btn btn-secondary"
                          style={{
                            padding: '0.2rem',
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefreshCase(c);
                          }}
                          title="Sync/Refresh milestones"
                          disabled={isSyncing}
                        >
                          <RefreshCw size={12} className={isSyncing && isActive ? "spin" : ""} style={{ animation: isSyncing && isActive ? 'spin 1.5s linear infinite' : 'none' }} />
                        </button>
                      </div>
                    </div>
                    <div className="case-item-detail">
                      <span>{c.service_center}</span>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        {c.premium_processed && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--secondary)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>Premium</span>}
                        {c.concurrent_filing && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>Concurrent</span>}
                        {c.country_code && c.country_code !== 'ROW' && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>{c.country_code}</span>}
                        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{days} Days Elapsed</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Similar Cases Feed */}
          <div className="glass-card">
            <h2 className="card-title">
              <Bell size={20} style={{ color: 'var(--primary)' }} />
              Live Activity Feed
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {feedItems.map((item, idx) => (
                <div key={idx} style={{ 
                  background: 'rgba(31, 41, 55, 0.2)', 
                  border: '1px solid var(--border-card)', 
                  borderRadius: '8px', 
                  padding: '0.8rem',
                  fontSize: '0.85rem',
                  animation: idx === 0 ? 'pulse 2s' : 'none',
                  borderLeft: idx === 0 ? '3px solid var(--status-approved)' : '1px solid var(--border-card)'
                }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

         {/* RIGHT COLUMN: Statistics Dashboard & Predictor Curves */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {selectedCase ? (
            <>
              {/* Case Details cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '0.5rem' }}>
                <CaseSummaryCard caseData={selectedCase} onUpdateCase={handleUpdateCaseDetails} />
                <CaseStatusPanel caseData={selectedCase} onRefresh={handleRefreshCase} isSyncing={isSyncing} />
              </div>

              {/* Main Predictor & Statistical Percentiles */}
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 className="card-title" style={{ marginBottom: 0 }}>
                    <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
                    Immigration Forecasting Model
                  </h2>
                  
                  {/* Tab Selector */}
                  <div className="tab-nav" style={{ margin: 0, padding: '0.2rem' }}>
                    <button 
                      className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                      onClick={() => setActiveTab('timeline')}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      Timelines
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'predictions' ? 'active' : ''}`}
                      onClick={() => setActiveTab('predictions')}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      Approval Probability
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
                      onClick={() => setActiveTab('queue')}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      Queue Standings
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
                      onClick={() => setActiveTab('trends')}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      Trends Heatmap
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'traffic' ? 'active' : ''}`}
                      onClick={() => setActiveTab('traffic')}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      API Traffic
                    </button>
                  </div>
                </div>

                {/* Selected Case Covariates Status Card (Only if we have filing date for gauge calculation) */}
                {selectedCase.filed_date && selectedCase.filed_date !== '1970-01-01' && (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Country of Birth:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedCase.country_code || 'ROW'}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Concurrent Filing:</span>
                      <strong style={{ color: selectedCase.concurrent_filing ? 'var(--status-approved)' : 'var(--text-muted)' }}>
                        {selectedCase.concurrent_filing ? 'Yes' : 'No'}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: '1rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Premium Processing:</span>
                      <strong style={{ color: selectedCase.premium_processed ? 'var(--status-approved)' : 'var(--text-muted)' }}>
                        {selectedCase.premium_processed ? 'Yes' : 'No'}
                      </strong>
                    </div>
                  </div>
                )}

                {/* How I Compare Wait Time Gauge (only if filing date is set and cohort data is sufficient) */}
                {predictionData && selectedCase.filed_date && selectedCase.filed_date !== '1970-01-01' && (isDemoMode || (predictionData.sample_size || 0) >= 30) && (
                  <div className="compare-gauge-card" style={{ marginBottom: '1.5rem', background: 'rgba(31, 41, 55, 0.25)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={16} style={{ color: 'var(--primary)' }} />
                        Timeline Alignment: How You Compare
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Filing Age: <strong>{calculateDaysElapsed(selectedCase.filed_date, selectedCase.completed_date)} days</strong>
                      </span>
                    </div>

                    {(() => {
                      const mainCurve = getAdjustedCurve(predictionData, selectedCase) || (predictionData?.survival_curve_json || []);
                      const p25 = getPercentileDays(mainCurve, 0.25) || predictionData?.p25_wait_days || 90;
                      const p50 = getPercentileDays(mainCurve, 0.50) || predictionData?.median_wait_days || 180;
                      const p75 = getPercentileDays(mainCurve, 0.75) || predictionData?.p75_wait_days || 270;
                      const days = calculateDaysElapsed(selectedCase.filed_date, selectedCase.completed_date);
                      
                      const maxDays = Math.max(p75 * 1.25, days * 1.1, 100);
                      const userPct = Math.min(100, (days / maxDays) * 100);
                      const p25Pct = (p25 / maxDays) * 100;
                      const p50Pct = (p50 / maxDays) * 100;
                      const p75Pct = (p75 / maxDays) * 100;

                      let statusMsg = "";
                      let statusColor = "var(--primary)";
                      if (days < p25) {
                        statusMsg = `Moving exceptionally fast! Your case is in the top 25% (earlier than ${p25} days).`;
                        statusColor = "var(--status-approved)";
                      } else if (days < p50) {
                        statusMsg = `Ahead of median pace! You are progressing faster than 50% of applicants (median ${p50} days).`;
                        statusColor = "var(--accent)";
                      } else if (days < p75) {
                        statusMsg = `Standard range. Under 75% of similar cases complete by Day ${p75}.`;
                        statusColor = "var(--status-rfe)";
                      } else {
                        statusMsg = `Delayed timeline. Your case has exceeded 75% of peers (average ${p50}d, threshold ${p75}d).`;
                        statusColor = "var(--status-denied)";
                      }

                      return (
                        <div>
                          {/* Gauge Track */}
                          <div style={{ position: 'relative', height: '28px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid var(--border-card)', margin: '1.5rem 0 0.8rem 0', overflow: 'visible' }}>
                            {/* Color Zones */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p25Pct}%`, background: 'rgba(16, 185, 129, 0.08)', borderRadius: '5px 0 0 5px' }} title="Fast Track Zone" />
                            <div style={{ position: 'absolute', left: `${p25Pct}%`, top: 0, bottom: 0, width: `${p50Pct - p25Pct}%`, background: 'rgba(20, 184, 166, 0.05)' }} title="Average Track Zone" />
                            <div style={{ position: 'absolute', left: `${p50Pct}%`, top: 0, bottom: 0, width: `${p75Pct - p50Pct}%`, background: 'rgba(245, 158, 11, 0.05)' }} title="Late Zone" />
                            <div style={{ position: 'absolute', left: `${p75Pct}%`, top: 0, bottom: 0, right: 0, background: 'rgba(239, 68, 68, 0.06)', borderRadius: '0 5px 5px 0' }} title="Extended Delay Zone" />

                            {/* Brackets Tick Lines */}
                            <div style={{ position: 'absolute', left: `${p25Pct}%`, top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.15)' }}>
                              <span style={{ position: 'absolute', top: '-18px', left: '-50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>25% ({p25}d)</span>
                            </div>
                            <div style={{ position: 'absolute', left: `${p50Pct}%`, top: 0, bottom: 0, width: '2px', background: 'var(--primary)', opacity: 0.5 }}>
                              <span style={{ position: 'absolute', top: '-18px', left: '-50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '700', whiteSpace: 'nowrap' }}>Median ({p50}d)</span>
                            </div>
                            <div style={{ position: 'absolute', left: `${p75Pct}%`, top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.15)' }}>
                              <span style={{ position: 'absolute', top: '-18px', left: '-50%', transform: 'translateX(-50%)', fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>75% ({p75}d)</span>
                            </div>

                            {/* User Position Indicator */}
                            <div style={{ position: 'absolute', left: `${userPct}%`, top: '-4px', bottom: '-4px', width: '4px', background: statusColor, borderRadius: '2px', boxShadow: `0 0 10px ${statusColor}`, zIndex: 5, overflow: 'visible' }}>
                              <div style={{ position: 'absolute', bottom: '-22px', left: '-50%', transform: 'translateX(-50%)', background: 'var(--bg-dark)', border: `1px solid ${statusColor}`, color: '#fff', fontSize: '0.7rem', fontWeight: '800', padding: '0.1rem 0.3rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                You: {days}d
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: '0.5rem 0.8rem', borderRadius: '6px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: statusColor, borderRadius: '50%' }} />
                            <span>{statusMsg}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Sub-Panel: Tab Contents */}
                {activeTab === 'predictions' ? (
                  <ForecastPanel
                    selectedCase={selectedCase}
                    predictionData={predictionData}
                    comparePredictionData={comparePredictionData}
                    compareServiceCenter={compareServiceCenter}
                    setCompareServiceCenter={setCompareServiceCenter}
                    isDemoMode={isDemoMode}
                    isLightMode={isLightMode}
                    onTriggerAnalytics={() => {
                      if (!isDemoMode) {
                        api.triggerAnalytics().then(() => alert("Analytics triggered! Refresh in a few seconds."));
                      }
                    }}
                  />
                ) : activeTab === 'trends' ? (
                  renderHeatmap()
                ) : activeTab === 'queue' ? (
                  (!selectedCase.filed_date || selectedCase.filed_date === '1970-01-01') ? (
                    <MissingDataPrompt 
                      title="Filing Receipt Date Required" 
                      message="Add the filing receipt date under 'Edit Details' to unlock cohort queue rankings."
                    />
                  ) : (
                    renderQueueInsights()
                  )
                ) : activeTab === 'traffic' ? (
                  <ApiTrafficPanel isDemoMode={isDemoMode} />
                ) : (
                  <TimelinePanel
                    selectedCase={selectedCase}
                    predictionData={predictionData}
                    onShare={handleShareTimeline}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="glass-card" style={{ display: 'flex', height: '240px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Clock size={32} style={{ marginRight: '0.5rem' }} />
              <span>Select an active case to view predictive modeling timeline charts.</span>
            </div>
          )}


          {/* Developer/Employer Skill Showcase Note Card */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <h3 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '0.6rem' }}>
              <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
              Developer Showcase Highlights
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
              This project demonstrates **advanced full-stack engineering and data analytics skills** including:
            </p>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '1.2rem', marginTop: '0.4rem', lineHeight: '1.6' }}>
              <li><strong>OAuth 2.0 Integration</strong>: Secure authentication flow calling the official USCIS Sandbox developer portal API.</li>
              <li><strong>Survival Analysis (lifelines)</strong>: Handled right-censored records dynamically to estimate time-to-event outcomes using Kaplan-Meier fitters.</li>
              <li><strong>Asynchronous Architectures</strong>: Implemented scheduled batch workers and background queues in FastAPI to update high-volume aggregations.</li>
              <li><strong>Premium Interactive UX</strong>: Crafted a visual client dashboard with interactive SVG calculations, eliminating heavy external dependencies.</li>
            </ul>
          </div>

        </div>

      </div>
      ) : (
        renderGlobalAnalytics()
      )}
    </div>
  );
}
