import React from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

export default function CaseStatusPanel({ caseData, onRefresh, isSyncing }) {
  const getStatusIcon = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s.includes('produced') || s.includes('delivered') || s.includes('mailed')) {
      return <CheckCircle2 size={24} style={{ color: 'var(--status-approved)' }} />;
    } else if (s.includes('rfe') || s.includes('evidence') || s.includes('request')) {
      return <AlertCircle size={24} style={{ color: 'var(--status-rfe)' }} />;
    } else if (s.includes('received') || s.includes('sent') || s.includes('fingerprint') || s.includes('biometric')) {
      return <CheckCircle2 size={24} style={{ color: 'var(--primary)' }} />;
    }
    return <HelpCircle size={24} style={{ color: 'var(--text-muted)' }} />;
  };

  const getStatusColorClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s.includes('produced') || s.includes('delivered') || s.includes('mailed')) {
      return 'status-approved';
    } else if (s.includes('rfe') || s.includes('evidence') || s.includes('request')) {
      return 'status-rfe';
    } else if (s.includes('denied') || s.includes('rejected')) {
      return 'status-denied';
    }
    return '';
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem' }}>
        <h2 className="card-title" style={{ margin: 0 }}>Current USCIS Case Status</h2>
        <button
          className="btn btn-secondary"
          style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          onClick={() => onRefresh(caseData.id)}
          disabled={isSyncing}
        >
          <RefreshCw size={12} className={isSyncing ? 'spin' : ''} style={{ animation: isSyncing ? 'spin 1.5s linear infinite' : 'none' }} />
          Refresh Status
        </button>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1.2rem',
        background: 'rgba(255,255,255,0.01)',
        border: '1px solid var(--border-card)',
        borderRadius: '8px'
      }}>
        {getStatusIcon(caseData.current_status)}
        <div style={{ flex: 1 }}>
          <h3 className={`case-status-text ${getStatusColorClass(caseData.current_status)}`} style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>
            {caseData.current_status || 'Status Pending'}
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
            Updated: {caseData.last_sync_date ? new Date(caseData.last_sync_date).toLocaleDateString() : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}
