import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function SandboxModeBanner({ isDemoMode }) {
  return (
    <div style={{
      background: isDemoMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
      border: isDemoMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
      padding: '0.6rem 1.2rem',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      fontSize: '0.85rem',
      color: isDemoMode ? '#f87171' : '#60a5fa'
    }}>
      <ShieldAlert size={16} />
      <span>
        {isDemoMode 
          ? <strong>Demo Mode Active:</strong> 
          : <strong>USCIS Sandbox Connected:</strong>}
        {' '}
        This dashboard displays {isDemoMode ? 'mock visualization data' : 'staging sandbox database information'} for demonstration purposes. Real production case data will not be queryable unless registered with production client credentials.
      </span>
    </div>
  );
}
