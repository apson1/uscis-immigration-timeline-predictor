import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { normalizeReceiptNumber, validateReceiptNumber, inferServiceCenter } from '../utils/receipt';

export default function ReceiptLookup({ 
  onLookup, 
  onSave,
  isSyncing, 
  errorMsg, 
  successMsg, 
  isDemoMode 
}) {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [inferredCenter, setInferredCenter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced fields
  const [formType, setFormType] = useState('I-485');
  const [serviceCenter, setServiceCenter] = useState('National Benefits Center');
  const [filedDate, setFiledDate] = useState('');
  const [countryCode, setCountryCode] = useState('ROW');
  const [concurrentFiling, setConcurrentFiling] = useState(false);
  const [premiumProcessed, setPremiumProcessed] = useState(false);

  useEffect(() => {
    const normalized = normalizeReceiptNumber(receiptNumber);
    if (validateReceiptNumber(normalized)) {
      const center = inferServiceCenter(normalized);
      setInferredCenter(center);
      if (center !== 'Unknown') {
        setServiceCenter(center);
      }
    } else {
      setInferredCenter('');
    }
  }, [receiptNumber]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const normalized = normalizeReceiptNumber(receiptNumber);
    if (!normalized) {
      return;
    }
    
    if (!validateReceiptNumber(normalized)) {
      return;
    }

    onSave({
      receipt_number: normalized,
      form_type: formType,
      service_center: inferredCenter || serviceCenter,
      filed_date: filedDate || null,
      country_code: countryCode,
      concurrent_filing: concurrentFiling,
      premium_processed: premiumProcessed
    });
  };

  const isValid = validateReceiptNumber(normalizeReceiptNumber(receiptNumber));

  return (
    <div className="glass-card">
      <h2 className="card-title" style={{ borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
        <Search size={20} className="text-primary" />
        Track Official Case Status
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>USCIS Receipt Number</label>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. SRC9999132719" 
              value={receiptNumber} 
              onChange={(e) => setReceiptNumber(e.target.value)} 
              style={{ paddingRight: '2.5rem', textTransform: 'uppercase' }}
            />
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
          </div>
          {inferredCenter && (
            <small style={{ color: 'var(--primary)', marginTop: '0.3rem', display: 'block', fontWeight: '500' }}>
              Detected Office: {inferredCenter}
            </small>
          )}
          {receiptNumber && !isValid && (
            <small style={{ color: 'var(--status-denied)', marginTop: '0.3rem', display: 'block' }}>
              Format must be 3 letters followed by 10 numbers.
            </small>
          )}
        </div>

        {/* Collapsible Advanced Form Options */}
        <div style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
              padding: '0.4rem 0',
              fontWeight: '500'
            }}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAdvanced ? "Hide Optional Timeline Details" : "Add Optional Timeline Details (Filing Date, Country, etc.)"}
          </button>

          {showAdvanced && (
            <div style={{
              marginTop: '0.8rem',
              padding: '1rem',
              background: 'rgba(255,255,255,0.01)',
              border: '1px solid var(--border-card)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem'
            }}>
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
                <label>Filing Receipt Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={filedDate} 
                  onChange={(e) => setFiledDate(e.target.value)} 
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  Required to generate statistical timeline estimates.
                </small>
              </div>

              <div className="form-group">
                <label>Country of Birth (Chargeability)</label>
                <select 
                  className="form-select" 
                  value={countryCode} 
                  onChange={(e) => setCountryCode(e.target.value)}
                >
                  <option value="ROW">Rest of World (ROW)</option>
                  <option value="IN">India (IN)</option>
                  <option value="CN">China (CN)</option>
                  <option value="MX">Mexico (MX)</option>
                  <option value="PH">Philippines (PH)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={concurrentFiling} 
                    onChange={(e) => setConcurrentFiling(e.target.checked)} 
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                  />
                  Concurrent Filing
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={premiumProcessed} 
                    onChange={(e) => setPremiumProcessed(e.target.checked)} 
                    style={{ width: '15px', height: '15px', accentColor: 'var(--primary)' }}
                  />
                  Premium Processing
                </label>
              </div>
            </div>
          )}
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
          disabled={isSyncing || !isValid}
        >
          {isSyncing ? (
            <>
              <RefreshCw size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
              Connecting to USCIS...
            </>
          ) : (
            <>
              <Search size={16} />
              {isDemoMode ? "Add Mock Case" : "Track USCIS Case"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
