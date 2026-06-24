import React from 'react';
import { Share2, Clock } from 'lucide-react';

export default function TimelinePanel({ selectedCase, predictionData, onShare }) {
  const milestones = selectedCase.milestones || [];

  const getEstimatedDecisionDate = () => {
    if (!selectedCase.filed_date || selectedCase.filed_date === '1970-01-01' || !predictionData || !predictionData.median_wait_days) {
      return null;
    }
    try {
      const filed = new Date(selectedCase.filed_date);
      const days = predictionData.median_wait_days;
      const est = new Date(filed.getTime() + (days * 24 * 60 * 60 * 1000));
      return est.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  const estDate = getEstimatedDecisionDate();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0', fontFamily: 'var(--font-heading)' }}>
          Verified Milestone History
        </h3>
        <button 
          className="btn btn-secondary" 
          style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
          onClick={onShare}
        >
          <Share2 size={14} />
          Share Timeline
        </button>
      </div>
      
      <div id="timeline-capture-area" style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
        <div className="timeline">
          {milestones.map((m, idx) => (
            <div key={idx} className="timeline-item">
              <div className="timeline-dot active" />
              <div className="timeline-content">
                <div>
                  <div className="timeline-title">{m.milestone_type.replace('_', ' ')}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    Status: {idx === milestones.length - 1 ? selectedCase.current_status : 'Milestone completed.'}
                  </div>
                </div>
                <span className="timeline-date">
                  {m.event_date === '1970-01-01' ? 'Not Provided' : m.event_date}
                </span>
              </div>
            </div>
          ))}

          {/* Pending Next Milestones estimation */}
          {!selectedCase.completed_date && estDate && (
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
                  {estDate}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
