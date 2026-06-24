import React from 'react';

export default function DataConfidenceBadge({ source, confidence }) {
  let bg = 'rgba(255,255,255,0.05)';
  let border = '1px solid rgba(255,255,255,0.1)';
  let color = 'var(--text-secondary)';
  let label = source || 'Unknown';

  if (source === 'uscis_sandbox') {
    bg = 'rgba(59, 130, 246, 0.15)';
    border = '1px solid rgba(59, 130, 246, 0.3)';
    color = '#60a5fa';
    label = 'USCIS Sandbox';
  } else if (source === 'mock' || source === 'demo' || !source) {
    bg = 'rgba(239, 68, 68, 0.15)';
    border = '1px solid rgba(239, 68, 68, 0.3)';
    color = '#f87171';
    label = 'Mock Demo';
  } else if (source === 'manual') {
    bg = 'rgba(245, 158, 11, 0.15)';
    border = '1px solid rgba(245, 158, 11, 0.3)';
    color = '#fbbf24';
    label = 'Manual Entry';
  } else if (source === 'import') {
    bg = 'rgba(16, 185, 129, 0.15)';
    border = '1px solid rgba(16, 185, 129, 0.3)';
    color = '#34d399';
    label = 'Imported JSON';
  }

  return (
    <span style={{
      background: bg,
      border: border,
      color: color,
      padding: '0.2rem 0.6rem',
      borderRadius: '20px',
      fontSize: '0.7rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }}>
      {label}
    </span>
  );
}
