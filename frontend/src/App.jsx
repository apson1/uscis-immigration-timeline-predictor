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
  ShieldAlert 
} from 'lucide-react';

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

export default function App() {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'predictions'
  
  // State for user cases
  const [cases, setCases] = useState(MOCK_CASES);
  const [selectedCaseId, setSelectedCaseId] = useState('case-2'); // default to pending I-765
  
  // Form State
  const [formType, setFormType] = useState('I-485');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [serviceCenter, setServiceCenter] = useState('National Benefits Center');
  const [filedDate, setFiledDate] = useState('');
  
  // Loading & Error States
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Active predictions data based on selected case
  const [predictionData, setPredictionData] = useState(null);
  const [chartTooltip, setChartTooltip] = useState({ x: 0, y: 0, content: '', visible: false });

  const selectedCase = cases.find(c => c.id === selectedCaseId);

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

  // Handle case form submission (Sync)
  const handleSyncCase = async (e) => {
    e.preventDefault();
    if (!receiptNumber || !filedDate) {
      setErrorMsg('Please fill in both Receipt Number and Filed Date.');
      return;
    }

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
          filed_date: filedDate,
          current_status: 'Case Was Received',
          completed_date: null,
          last_sync_date: new Date().toISOString(),
          milestones: [
            { milestone_type: 'RECEIVED', event_date: filedDate }
          ]
        };

        setCases([newCase, ...cases]);
        setSelectedCaseId(newId);
        setReceiptNumber('');
        setSuccessMsg(`Successfully synced mock Sandbox receipt ${newCase.receipt_number}!`);
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
            filed_date: filedDate
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
        
        // Trigger background recalculation in case database changes
        fetch(`${BACKEND_URL}/api/analytics/trigger`, { method: 'POST' }).catch(() => {});
        
      } catch (err) {
        setErrorMsg(err.message || 'API Connection refused. Ensure FastAPI server is running.');
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
    const maxDays = points[points.length - 1].days;
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
    // Note: Y coordinates are inverted in SVG (0 is top, chartHeight is bottom)
    const getY = (p) => paddingTop + chartHeight - p * chartHeight;

    // Build SVG Path string
    let pathD = `M ${getX(points[0].days)} ${getY(points[0].probability)}`;
    let areaD = `M ${getX(points[0].days)} ${getY(0)}`; // Bottom left

    points.forEach(pt => {
      pathD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
      areaD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
    });

    areaD += ` L ${getX(points[points.length - 1].days)} ${getY(0)} Z`; // Close the polygon

    // Calculate user's current position on the curve
    const userDays = selectedCase ? calculateDaysElapsed(selectedCase.filed_date, selectedCase.completed_date) : 0;
    let userX = getX(userDays);
    let isUserOut = false;
    if (userDays > maxDays) {
      userX = getX(maxDays);
      isUserOut = true;
    }

    // Find user's probability (closest day lookup)
    const closestPoint = points.reduce((prev, curr) => {
      return (Math.abs(curr.days - userDays) < Math.abs(prev.days - userDays) ? curr : prev);
    });
    const userProbY = getY(closestPoint.probability);

    return (
      <div className="chart-container" style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--secondary)" />
            </linearGradient>
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
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

          {/* Area & Line */}
          <path d={areaD} className="chart-area" />
          <path d={pathD} className="chart-line" />

          {/* Median Wait Line indicator */}
          {predictionData.median_wait_days && (
            <g>
              <line 
                x1={getX(predictionData.median_wait_days)} 
                y1={paddingTop} 
                x2={getX(predictionData.median_wait_days)} 
                y2={height - paddingBottom} 
                stroke="var(--status-rfe)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text 
                x={getX(predictionData.median_wait_days) + 5} 
                y={paddingTop + 15} 
                fill="var(--status-rfe)" 
                fontSize="0.75rem"
                fontWeight="600"
              >
                Median: {predictionData.median_wait_days}d
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
                stroke="#fff" 
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
                fill="#fff" 
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
              transition: 'all 0.1s ease'
            }}
          >
            {chartTooltip.content}
          </div>
        )}
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
        
        {/* Toggle Mode */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
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
            <h2 className="card-title">
              <PlusCircle size={20} className="text-primary" />
              Sync USCIS Sandbox Case
            </h2>
            
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
                      {renderStatusBadge(c.current_status)}
                    </div>
                    <div className="case-item-detail">
                      <span>{c.service_center}</span>
                      <span style={{ fontWeight: '600', color: '#fff' }}>{days} Days Elapsed</span>
                    </div>
                  </div>
                );
              })}
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
              </div>
            </div>

            {selectedCase ? (
              <>
                {/* Visual Metadata banner */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-card)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filing Category</span>
                    <h3 style={{ color: '#fff', fontFamily: 'var(--font-heading)' }}>{selectedCase.form_type}</h3>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filing Date</span>
                    <h3 style={{ color: '#fff', fontFamily: 'var(--font-heading)' }}>{selectedCase.filed_date}</h3>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Office Location</span>
                    <h3 style={{ color: '#fff', fontFamily: 'var(--font-heading)' }}>{selectedCase.service_center}</h3>
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
                ) : (
                  
                  /* Sub-Panel: Detailed Milestones View */
                  <div>
                    <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem', fontFamily: 'var(--font-heading)' }}>Verified Milestone History</h3>
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
