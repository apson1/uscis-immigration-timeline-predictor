import React, { useState } from 'react';
import { Calendar, Building, Clock, Edit2, Check } from 'lucide-react';
import DataConfidenceBadge from './DataConfidenceBadge';

export default function CaseSummaryCard({ caseData, onUpdateCase }) {
  const [isEditing, setIsEditing] = useState(false);
  const [filedDate, setFiledDate] = useState(caseData.filed_date || '');
  const [formType, setFormType] = useState(caseData.form_type || 'I-485');
  const [serviceCenter, setServiceCenter] = useState(caseData.service_center || 'National Benefits Center');

  const handleUpdate = () => {
    onUpdateCase({
      ...caseData,
      filed_date: filedDate || null,
      form_type: formType,
      service_center: serviceCenter
    });
    setIsEditing(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '1970-01-01') return 'Not Provided';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatLastSync = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>RECEIPT NUMBER</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
            {caseData.receipt_number}
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
          <DataConfidenceBadge source={caseData.data_source || 'demo'} confidence={caseData.data_confidence} />
          {caseData.premium_processed && (
            <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>
              PREMIUM
            </span>
          )}
        </div>
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-card)', padding: '1rem', borderRadius: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '600' }}>Edit Case Metadata</h4>
          <div className="form-group">
            <label>Form Type</label>
            <select className="form-select" value={formType} onChange={(e) => setFormType(e.target.value)}>
              <option value="I-485">I-485 (Adjustment of Status)</option>
              <option value="I-130">I-130 (Petition for Alien Relative)</option>
              <option value="I-765">I-765 (Employment Authorization)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Service Center</label>
            <select className="form-select" value={serviceCenter} onChange={(e) => setServiceCenter(e.target.value)}>
              <option value="National Benefits Center">National Benefits Center</option>
              <option value="Texas Service Center">Texas Service Center</option>
              <option value="California Service Center">California Service Center</option>
              <option value="Nebraska Service Center">Nebraska Service Center</option>
            </select>
          </div>
          <div className="form-group">
            <label>Filing Date</label>
            <input type="date" className="form-input" value={filedDate} onChange={(e) => setFiledDate(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={handleUpdate} style={{ padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
            <Check size={14} /> Save Details
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <Building size={16} className="text-secondary" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Service Center</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                {caseData.service_center || 'Unknown'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <Calendar size={16} className="text-secondary" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Filing Receipt Date</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                {formatDate(caseData.filed_date)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
              <Clock size={16} className="text-secondary" />
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Last Sync Checked</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                {formatLastSync(caseData.last_sync_date)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-secondary)',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontWeight: '500'
              }}
            >
              <Edit2 size={12} /> Edit Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
