import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { getSandboxTrafficSummary } from '../api/client';

export default function ApiTrafficPanel({ isDemoMode }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (isDemoMode) {
        // Mock Sandbox Traffic summary
        setTimeout(() => {
          setSummary({
            environment: "sandbox",
            days: [
              { date: "2026-06-14", total_requests: 15, success_200: 10, client_errors_4xx: 5, server_errors_5xx: 0, avg_response_time_ms: 180.5 },
              { date: "2026-06-15", total_requests: 22, success_200: 18, client_errors_4xx: 4, server_errors_5xx: 0, avg_response_time_ms: 215.1 },
              { date: "2026-06-16", total_requests: 18, success_200: 14, client_errors_4xx: 4, server_errors_5xx: 0, avg_response_time_ms: 195.4 },
              { date: "2026-06-17", total_requests: 30, success_200: 25, client_errors_4xx: 5, server_errors_5xx: 0, avg_response_time_ms: 210.8 },
              { date: "2026-06-18", total_requests: 25, success_200: 20, client_errors_4xx: 5, server_errors_5xx: 0, avg_response_time_ms: 190.2 }
            ],
            consecutive_days: 5,
            ready_for_production_request: true
          });
          setIsLoading(false);
        }, 600);
      } else {
        const data = await getSandboxTrafficSummary();
        setSummary(data);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Could not retrieve API log summary.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [isDemoMode]);

  const checklistItems = [
    { label: "Register Sandbox Developer Account", done: true },
    { label: "Register Sandbox App & Credentials", done: true },
    { label: "Configure API OAuth client integration", done: true },
    { label: "Generate HTTP status 200 OK lookup logs", done: summary ? summary.days.some(d => d.success_200 > 0) : false },
    { label: "Generate HTTP status 4xx Client Error logs", done: summary ? summary.days.some(d => d.client_errors_4xx > 0) : false },
    { label: "Perform Sandbox lookups across 5 consecutive calendar days", done: summary ? summary.consecutive_days >= 5 : false }
  ];

  const totalRequests = summary ? summary.days.reduce((acc, d) => acc + d.total_requests, 0) : 0;
  const isReady = summary ? summary.ready_for_production_request : false;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem' }}>
        <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={20} className="text-secondary" />
          USCIS API Traffic & Staging Audit
        </h2>
        <button 
          className="btn btn-secondary" 
          style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
          onClick={fetchSummary}
          disabled={isLoading}
        >
          <RefreshCw size={12} className={isLoading ? 'spin' : ''} />
          Refresh Stats
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Checklist */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
            Production Access Requirements
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            USCIS requires evidence of complete developer sandbox testing showing at least 5 consecutive days of successful/failed status queries before approving production API access.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {checklistItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} style={{ color: item.done ? 'var(--status-approved)' : 'var(--text-muted)', fill: item.done ? 'rgba(16, 185, 129, 0.1)' : 'none' }} />
                <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: item.done ? 'none' : 'none' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            background: isReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: isReady ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
            padding: '1rem',
            borderRadius: '8px',
            marginTop: '0.5rem',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: isReady ? '#34d399' : '#fbbf24', fontWeight: 'bold' }}>
              {isReady ? "Ready for Production Request" : "Sandbox Testing Incomplete"}
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'block' }}>
              {isReady 
                ? "You have completed the consecutive day requirements. Export logs for submission."
                : `Completed consecutive days: ${summary ? summary.consecutive_days : 0}/5`}
            </span>
          </div>
        </div>

        {/* Right Column: Traffic Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600' }}>
            Sandbox Traffic Log (Recent Days)
          </h3>

          {error && (
            <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--status-denied)', fontSize: '0.8rem', alignItems: 'center' }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {summary && summary.days.length === 0 && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
              No API request traffic logged yet. Run the traffic generator script to seed logs.
            </div>
          )}

          {summary && summary.days.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.3rem' }}>
              {summary.days.map((day, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-card)',
                  padding: '0.8rem 1rem',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{day.date}</strong>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Avg Response Time: {day.avg_response_time_ms} ms
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', fontWeight: '500' }}>
                      Requests: {day.total_requests}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.65rem', marginTop: '0.2rem' }}>
                      <span style={{ color: 'var(--status-approved)' }}>200 OK: {day.success_200}</span>
                      <span style={{ color: 'var(--status-rfe)' }}>4xx: {day.client_errors_4xx}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
