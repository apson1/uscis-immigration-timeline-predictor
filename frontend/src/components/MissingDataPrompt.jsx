import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function MissingDataPrompt({ title, message }) {
  return (
    <div className="glass-card" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '3rem 2rem',
      gap: '1rem',
      background: 'rgba(255,255,255,0.01)',
      border: '1px dashed var(--border-card)',
      borderRadius: '12px'
    }}>
      <AlertCircle size={40} style={{ color: 'var(--status-rfe)' }} />
      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: '1.5' }}>
        {message}
      </p>
    </div>
  );
}
