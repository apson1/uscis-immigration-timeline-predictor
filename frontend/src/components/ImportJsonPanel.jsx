import React, { useState } from 'react';
import { PlusCircle, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ImportJsonPanel({ onImport, isSyncing, errorMsg, successMsg }) {
  const [serviceCenter, setServiceCenter] = useState('National Benefits Center');
  const [rawJsonText, setRawJsonText] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');
    if (!rawJsonText.trim()) {
      setLocalError('Please paste the raw JSON text.');
      return;
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(rawJsonText.trim());
    } catch {
      setLocalError('Invalid JSON format. Please paste a valid JSON document.');
      return;
    }

    onImport({
      service_center: serviceCenter,
      payload: parsedPayload
    });
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>
          <PlusCircle size={20} className="text-primary" />
          Import my.uscis.gov Case History
        </h2>
      </div>

      <form onSubmit={handleSubmit}>
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

        {(localError || errorMsg) && (
          <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--status-denied)', fontSize: '0.85rem', marginBottom: '1rem', alignItems: 'center' }}>
            <AlertCircle size={14} />
            <span>{localError || errorMsg}</span>
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
    </div>
  );
}
