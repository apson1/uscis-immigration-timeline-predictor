import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Database, 
  RefreshCw, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  HelpCircle, 
  ChevronRight, 
  Activity, 
  TrendingUp, 
  ShieldAlert,
  Moon,
  Sun,
  Share2,
  Bell
} from 'lucide-react';
import html2canvas from 'html2canvas';

// Setup environment URLs (FastAPI backend)
const BACKEND_URL = 'http://127.0.0.1:8000';

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

export default function App() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'predictions'
  
  // Theme Toggle Effect
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

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

  const handleSyncCase = async (e) => {
    e.preventDefault();
    if (!receiptNumber) {
      setErrorMsg('Please fill in the Receipt Number.');
      return;
    }

    const finalFiledDate = filedDate || new Date().toISOString().split('T')[0];

    setErrorMsg('');
    setSuccessMsg('');
    setIsSyncing(true);

    if (isDemoMode) {
      // Simulate Sandbox API Response delay
      setTimeout(() => {
        const newId = `case-${Date.now()}`;
        const newCase = {
          id: newId,
          form_type: formType,
          receipt_number: receiptNumber.toUpperCase(),
          service_center: serviceCenter,
          filed_date: finalFiledDate,
          current_status: 'Case Was Received',
          completed_date: null,
          last_sync_date: new Date().toISOString(),
          milestones: [
            { milestone_type: 'RECEIVED', event_date: finalFiledDate }
          ]
        };

        setCases([newCase, ...cases]);
        setSelectedCaseId(newId);
        setReceiptNumber('');
        setSuccessMsg(`Successfully synced mock Sandbox receipt ${newCase.receipt_number}!`);
        notifyUser('USCIS Update', `Mock case ${newCase.receipt_number} synced. Status: ${newCase.current_status}`);
        setIsSyncing(false);
      }, 1500);
    } else {
      // Call FastAPI backend /api/cases/sync
      try {
        const response = await fetch(`${BACKEND_URL}/api/cases/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            receipt_number: receiptNumber.toUpperCase(),
            user_id: 'dev_user_1', // Single-user profile sandbox mode
            form_type: formType,
            service_center: serviceCenter,
            filed_date: finalFiledDate
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Sync failed.');
        }

        // Format case milestones for UI
        const fetchedCase = data.case;
        
        // Fetch fresh list of cases from DB (in real app, we'd query API. Here we just update local state)
        // Let's add it or replace it in local cases state
        const updatedCases = cases.filter(c => c.receipt_number !== fetchedCase.receipt_number);
        setCases([fetchedCase, ...updatedCases]);
        setSelectedCaseId(fetchedCase.id);
        
        setReceiptNumber('');
        setSuccessMsg(`Successfully connected to USCIS Sandbox. Sync complete!`);
        notifyUser('USCIS Update', `Case ${fetchedCase.receipt_number} synced. Status: ${fetchedCase.current_status}`);
        
        // Trigger background recalculation in case database changes
        fetch(`${BACKEND_URL}/api/analytics/trigger`, { method: 'POST' }).catch(() => {});
        
      } catch (err) {
        setErrorMsg(err.message || 'API Connection refused. Ensure FastAPI server is running.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleImportDetailedCase = async (e) => {
    e.preventDefault();
    if (!rawJsonText.trim()) {
      setErrorMsg('Please paste the raw JSON text from my.uscis.gov.');
      return;
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(rawJsonText.trim());
    } catch (err) {
      setErrorMsg('Invalid JSON format. Please paste a valid JSON document.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsSyncing(true);

    if (isDemoMode) {
      setTimeout(() => {
        const dataObj = parsedPayload.data || parsedPayload;
        const receipt = dataObj.receiptNumber || dataObj.receipt_number || `IOE${Date.now()}`;
        const fType = dataObj.formType || dataObj.form_type || 'I-485';
        const sDate = dataObj.submissionDate || dataObj.submittedDate || dataObj.receiptDate || new Date().toISOString().split('T')[0];
        const newId = `case-${Date.now()}`;
        
        // We collect milestone event dates into a map to deduplicate by milestone_type
        const milestoneMap = {};
        
        // 1. RECEIVED
        milestoneMap["RECEIVED"] = sDate;
        
        // 2. evidenceRequests
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
        
        // 3. notices
        const notices = dataObj.notices || [];
        notices.forEach(n => {
          if (n.actionType === "Appointment Scheduled") {
            const apptDate = n.appointmentDateTime || n.generationDate;
            if (apptDate) {
              milestoneMap["BIOMETRICS"] = apptDate.split('T')[0];
            }
          }
        });
        
        // 4. events
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
        
        // 5. history
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
        
        // Convert map to milestones array
        const milestones = Object.keys(milestoneMap).map(type => ({
          milestone_type: type,
          event_date: milestoneMap[type]
        }));
        
        // Deduce current status
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
          service_center: serviceCenter,
          filed_date: sDate,
          current_status: statusText,
          completed_date: completedDate,
          last_sync_date: new Date().toISOString(),
          milestones: milestones
        };

        setCases([newCase, ...cases]);
        setSelectedCaseId(newId);
        setRawJsonText('');
        setSuccessMsg(`Successfully imported mock case ${newCase.receipt_number}!`);
        notifyUser('USCIS Import', `Mock case ${newCase.receipt_number} imported successfully.`);
        setIsSyncing(false);
      }, 1500);
    } else {
      try {
        const response = await fetch(`${BACKEND_URL}/api/cases/import-detailed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: 'dev_user_1',
            service_center: serviceCenter,
            payload: parsedPayload
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.detail || 'Import failed.');
        }

        const fetchedCase = data.case;
        const updatedCases = cases.filter(c => c.receipt_number !== fetchedCase.receipt_number);
        setCases([fetchedCase, ...updatedCases]);
        setSelectedCaseId(fetchedCase.id);
        
        setRawJsonText('');
        setSuccessMsg(`Successfully imported case ${fetchedCase.receipt_number} from my.uscis.gov JSON!`);
        notifyUser('USCIS Import', `Case ${fetchedCase.receipt_number} imported. Status: ${fetchedCase.current_status}`);
        
        fetch(`${BACKEND_URL}/api/analytics/trigger`, { method: 'POST' }).catch(() => {});
        
      } catch (err) {
        setErrorMsg(err.message || 'API Connection refused. Ensure FastAPI server is running.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Handle manual case refresh/sync
  const handleRefreshCase = async (caseToSync) => {
    if (!caseToSync) return;
    
    setIsSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (isDemoMode) {
      // Simulation for mock refresh
      setTimeout(() => {
        setSuccessMsg(`Mock Sandbox sync completed for ${caseToSync.receipt_number}!`);
        setIsSyncing(false);
      }, 1000);
    } else {
      try {
        const response = await fetch(`${BACKEND_URL}/api/cases/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            receipt_number: caseToSync.receipt_number,
            user_id: caseToSync.user_id || 'dev_user_1',
            form_type: caseToSync.form_type,
            service_center: caseToSync.service_center,
            filed_date: caseToSync.filed_date
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || 'Sync failed.');
        }

        const syncedCase = data.case;
        // Replace matching case in state
        const updatedCases = cases.map(c => c.id === syncedCase.id ? syncedCase : c);
        setCases(updatedCases);
        setSuccessMsg(`Successfully synced Sandbox receipt ${syncedCase.receipt_number}!`);
        notifyUser('USCIS Update', `Case ${syncedCase.receipt_number} refreshed. Status: ${syncedCase.current_status}`);
        
        // Trigger background recalculation
        fetch(`${BACKEND_URL}/api/analytics/trigger`, { method: 'POST' }).catch(() => {});
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

    const points = predictionData.survival_curve_json;
    const comparePoints = comparePredictionData?.survival_curve_json || [];

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
          {predictionData.median_wait_days && (
            <g>
              <line 
                x1={getX(predictionData.median_wait_days)} 
                y1={paddingTop} 
                x2={getX(predictionData.median_wait_days)} 
                y2={height - paddingBottom} 
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <text 
                x={getX(predictionData.median_wait_days) + 5} 
                y={paddingTop + 15} 
                fill="var(--primary)" 
                fontSize="0.75rem"
                fontWeight="600"
              >
                Median: {predictionData.median_wait_days}d
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
                onMouseEnter={(e) => {
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
              {predictionData.service_center}
            </span>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flex: '1 1 80px', zIndex: 2 }}>
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
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    return (
      <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Historical Processing Time by Filing Month (Simulated)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.8rem' }}>
          {MOCK_HEATMAP_DATA.map((data, i) => {
            let bg = 'rgba(16, 185, 129, 0.15)';
            let border = 'var(--status-approved)';
            if (data.wait_days >= 220) { bg = 'rgba(239, 68, 68, 0.15)'; border = 'var(--status-denied)'; }
            else if (data.wait_days >= 180) { bg = 'rgba(245, 158, 11, 0.15)'; border = 'var(--status-rfe)'; }
            
            return (
              <div key={i} style={{ padding: '0.8rem', background: bg, borderBottom: `3px solid ${border}`, borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{data.month}</div>
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginTop: '0.3rem' }}>{data.wait_days}d</div>
              </div>
            )
          })}
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
          <button
            className="btn btn-secondary"
            style={{ padding: '0.4rem', width: 'auto', borderRadius: '50%' }}
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

      {/* Main Grid Workspace */}
      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: Input Form & Case Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Sync Case Form */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem' }}>
              <h2 className="card-title" style={{ marginBottom: 0 }}>
                <PlusCircle size={20} className="text-primary" />
                Case Integration
              </h2>
              <div className="tab-nav" style={{ margin: 0, padding: '0.2rem' }}>
                <button 
                  className={`tab-btn ${syncTab === 'sandbox' ? 'active' : ''}`}
                  onClick={() => { setSyncTab('sandbox'); setSuccessMsg(''); setErrorMsg(''); }}
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Sandbox Sync
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
              <form onSubmit={handleSyncCase}>
                <div className="form-group">
                  <label>Visa Form Type</label>
                  <select 
                    className="form-select" 
                    value={formType} 
                    onChange={(e) => setFormType(e.target.value)}
                  >
                    <option value="I-485">I-485 (Adjustment of Status)</option>
                    <option value="I-130">I-130 (Petition for Alien Relative)</option>
                    <option value="I-765">I-765 (Employment Authorization)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Receipt Number (Sandbox Test Key)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. MSC2690189472" 
                    value={receiptNumber} 
                    onChange={(e) => setReceiptNumber(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label>Service Center</label>
                  <select 
                    className="form-select" 
                    value={serviceCenter} 
                    onChange={(e) => setServiceCenter(e.target.value)}
                  >
                    <option value="National Benefits Center">National Benefits Center</option>
                    <option value="Texas Service Center">Texas Service Center</option>
                    <option value="California Service Center">California Service Center</option>
                    <option value="Nebraska Service Center">Nebraska Service Center</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Filing Receipt Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={filedDate} 
                    onChange={(e) => setFiledDate(e.target.value)} 
                  />
                </div>

                {errorMsg && (
                  <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--status-denied)', fontSize: '0.85rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <AlertCircle size={14} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--status-approved)', fontSize: '0.85rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <CheckCircle2 size={14} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                      Syncing Sandbox API...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Sync Case Milestones
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleImportDetailedCase}>
                <div className="form-group">
                  <label>Service Center (Processing Location)</label>
                  <select 
                    className="form-select" 
                    value={serviceCenter} 
                    onChange={(e) => setServiceCenter(e.target.value)}
                  >
                    <option value="National Benefits Center">National Benefits Center</option>
                    <option value="Texas Service Center">Texas Service Center</option>
                    <option value="California Service Center">California Service Center</option>
                    <option value="Nebraska Service Center">Nebraska Service Center</option>
                  </select>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.3rem', display: 'block' }}>
                    my.uscis.gov JSON does not specify your processing office; please select it manually.
                  </small>
                </div>

                <div className="form-group">
                  <label>my.uscis.gov Raw Case JSON</label>
                  <textarea 
                    className="form-input" 
                    rows="8"
                    placeholder='Paste raw JSON starting with {"data": ...} or {"receiptNumber": ...}'
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                    value={rawJsonText} 
                    onChange={(e) => setRawJsonText(e.target.value)} 
                  />
                </div>

                {errorMsg && (
                  <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--status-denied)', fontSize: '0.85rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <AlertCircle size={14} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--status-approved)', fontSize: '0.85rem', marginBottom: '1rem', alignItems: 'center' }}>
                    <CheckCircle2 size={14} />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                      Importing Case JSON...
                    </>
                  ) : (
                    <>
                      <PlusCircle size={16} />
                      Import Detailed Case History
                    </>
                  )}
                </button>
              </form>
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
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{days} Days Elapsed</span>
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
                  Survival Curve
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
              </div>
            </div>

            {selectedCase ? (
              <>
                {/* Visual Metadata banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filing Category</span>
                    <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{selectedCase.form_type}</h3>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filing Date</span>
                    <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{selectedCase.filed_date}</h3>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Office Location</span>
                    <h3 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>{selectedCase.service_center}</h3>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Compare with Center</span>
                    <div style={{ marginTop: '0.2rem' }}>
                      <select 
                        className="form-select" 
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto', background: 'rgba(31, 41, 55, 0.6)' }}
                        value={compareServiceCenter}
                        onChange={(e) => setCompareServiceCenter(e.target.value)}
                      >
                        <option value="">None (Single Center)</option>
                        <option value="National Benefits Center">National Benefits Center</option>
                        <option value="Texas Service Center">Texas Service Center</option>
                        <option value="California Service Center">California Service Center</option>
                        <option value="Nebraska Service Center">Nebraska Service Center</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Sub-Panel: Survival Curve View */}
                {activeTab === 'predictions' ? (
                  <div>
                    <div className="stats-grid">
                      <div className="stat-tile">
                        <div className="stat-value">{predictionData ? `${predictionData.median_wait_days}d` : '--'}</div>
                        <div className="stat-label">Median Wait (50%)</div>
                      </div>
                      <div className="stat-tile">
                        <div className="stat-value">{predictionData ? `${predictionData.p25_wait_days}d` : '--'}</div>
                        <div className="stat-label">Fast Track (25%)</div>
                      </div>
                      <div className="stat-tile">
                        <div className="stat-value">{predictionData ? `${predictionData.p75_wait_days}d` : '--'}</div>
                        <div className="stat-label">Moderate Delay (75%)</div>
                      </div>
                      <div className="stat-tile">
                        <div className="stat-value">{predictionData ? `${predictionData.p90_wait_days}d` : '--'}</div>
                        <div className="stat-label">Severe Delay (90%)</div>
                      </div>
                    </div>

                    <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Probability of Approval Completion</span>
                        <span>Days Elapsed from Receipt Date</span>
                      </div>
                      {renderSurvivalChart()}
                    </div>
                  </div>
                ) : activeTab === 'trends' ? (
                  renderHeatmap()
                ) : activeTab === 'queue' ? (
                  renderQueueInsights()
                ) : (
                  /* Sub-Panel: Detailed Milestones View */
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0', fontFamily: 'var(--font-heading)' }}>Verified Milestone History</h3>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                        onClick={handleShareTimeline}
                      >
                        <Share2 size={14} />
                        Share Timeline
                      </button>
                    </div>
                    
                    <div id="timeline-capture-area" style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
                      <div className="timeline">
                        {selectedCase.milestones && selectedCase.milestones.map((m, idx) => (
                          <div key={idx} className="timeline-item">
                            <div className="timeline-dot active" />
                            <div className="timeline-content">
                              <div>
                                <div className="timeline-title">{m.milestone_type.replace('_', ' ')}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                  Status: {idx === selectedCase.milestones.length - 1 ? selectedCase.current_status : 'Milestone completed.'}
                                </div>
                              </div>
                              <span className="timeline-date">{m.event_date}</span>
                            </div>
                          </div>
                        ))}

                        {/* Pending Next Milestones estimation */}
                        {!selectedCase.completed_date && (
                          <div className="timeline-item" style={{ opacity: 0.5 }}>
                            <div className="timeline-dot" style={{ backgroundColor: 'var(--status-rfe)' }} />
                            <div className="timeline-content">
                              <div>
                                <div className="timeline-title" style={{ color: 'var(--status-rfe)' }}>Estimated Decision Date</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                  Estimated completion based on Kaplan-Meier median average
                                </div>
                              </div>
                              <span className="timeline-date" style={{ color: 'var(--status-rfe)', fontWeight: '600' }}>
                                {predictionData && predictionData.median_wait_days ? 
                                  new Date(new Date(selectedCase.filed_date).getTime() + (predictionData.median_wait_days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
                                  : '--'
                                }
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', height: '240px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ marginRight: '0.5rem' }} />
                <span>Select an active case to view predictive modeling timeline charts.</span>
              </div>
            )}
          </div>

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
    </div>
  );
}
