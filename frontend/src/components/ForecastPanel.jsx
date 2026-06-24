import React, { useState } from 'react';
import { Activity, TrendingUp, Layers } from 'lucide-react';
import MissingDataPrompt from './MissingDataPrompt';

const calculateDaysElapsed = (startDateStr, endDateStr) => {
  if (!startDateStr || startDateStr === '1970-01-01') return 0;
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getAdjustedCurve = (predData, caseObj) => {
  if (!predData || !predData.baseline_curve_json) return null;
  if (!caseObj) return predData.survival_curve_json;
  
  const baseline = predData.baseline_curve_json;
  const coefs = predData.cox_coefficients || {};
  
  const z_concurrent = caseObj.concurrent_filing ? 1 : 0;
  const z_premium = caseObj.premium_processed ? 1 : 0;
  const isBacklog = ['IN', 'CN', 'MX', 'PH'].includes(String(caseObj.country_code).toUpperCase());
  const z_backlog = isBacklog ? 1 : 0;
  
  const beta_concurrent = coefs.concurrent_filing || 0.0;
  const beta_premium = coefs.premium_processed || 0.0;
  const beta_backlog = coefs.is_backlogged_country || 0.0;
  
  const beta_sum = (beta_concurrent * z_concurrent) + (beta_premium * z_premium) + (beta_backlog * z_backlog);
  const exp_beta = Math.exp(beta_sum);
  
  return baseline.map(pt => {
    const S0 = Math.max(0, Math.min(1, 1.0 - pt.probability));
    const adjusted_p = 1.0 - Math.pow(S0, exp_beta);
    return {
      days: pt.days,
      probability: Math.max(0, Math.min(1, adjusted_p))
    };
  });
};

const getPercentileDays = (curve, pct) => {
  if (!curve || curve.length === 0) return null;
  const pt = curve.find(p => p.probability >= pct);
  return pt ? pt.days : null;
};

export default function ForecastPanel({
  selectedCase,
  predictionData,
  comparePredictionData,
  compareServiceCenter,
  setCompareServiceCenter,
  isDemoMode,
  isLightMode,
  onTriggerAnalytics
}) {
  const [chartTooltip, setChartTooltip] = useState({ x: 0, y: 0, content: '', visible: false });

  // 1. Guard against missing filing date
  if (!selectedCase?.filed_date || selectedCase.filed_date === '1970-01-01') {
    return (
      <MissingDataPrompt 
        title="Filing Receipt Date Required" 
        message="Add the filing receipt date under 'Edit Details' to unlock statistical timeline estimates. Current case status can still be tracked without it."
      />
    );
  }

  // 2. Guard against missing form type / service center
  if (!selectedCase?.form_type || !selectedCase?.service_center) {
    return (
      <MissingDataPrompt 
        title="Filing Information Required" 
        message="Please select a valid Form Type and Service Center to view statistical forecasts."
      />
    );
  }

  // 3. Guard against insufficient cohort data (gated at 30 cases or no data cached)
  // For Demo Mode, we assume we always have data
  const hasData = isDemoMode || (predictionData && predictionData.has_data);
  const sampleSize = isDemoMode ? 100 : (predictionData?.sample_size || 0);

  if (!hasData) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '3rem 2rem', gap: '1rem' }}>
        <Activity size={40} style={{ color: 'var(--text-muted)' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Insufficient Cohort Data</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '380px', lineHeight: '1.5' }}>
          We require a minimum sample size of 30 cases for this service center cohort before generating predictions. Currently cached: {sampleSize} cases.
        </p>
        <button 
          onClick={onTriggerAnalytics}
          className="btn btn-secondary" 
          style={{ marginTop: '0.5rem', width: 'auto', padding: '0.4rem 1rem' }}
        >
          Run Batch Analysis Work
        </button>
      </div>
    );
  }

  // Helper to render SVG Kaplan-Meier Chart
  const renderSurvivalChart = () => {
    if (!predictionData || !predictionData.survival_curve_json || predictionData.survival_curve_json.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '180px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <Activity size={32} style={{ marginBottom: '0.8rem' }} />
          <p style={{ fontSize: '0.85rem' }}>No statistical curve coordinates cached for this category yet.</p>
        </div>
      );
    }

    const points = getAdjustedCurve(predictionData, selectedCase) || predictionData.survival_curve_json;
    const comparePoints = getAdjustedCurve(comparePredictionData, selectedCase) || comparePredictionData?.survival_curve_json || [];
    const baselinePoints = predictionData.baseline_curve_json || predictionData.survival_curve_json;
    const adjustedMedian = getPercentileDays(points, 0.50) || predictionData.median_wait_days;

    const maxDaysMain = points.length > 0 ? points[points.length - 1].days : 0;
    const maxDaysCompare = comparePoints.length > 0 ? comparePoints[comparePoints.length - 1].days : 0;
    const maxDays = Math.max(maxDaysMain, maxDaysCompare, 100);

    const height = 220;
    const width = 560;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const getX = (d) => paddingLeft + (d / maxDays) * chartWidth;
    const getY = (p) => paddingTop + chartHeight - p * chartHeight;

    let baselinePathD = '';
    if (predictionData.baseline_curve_json && predictionData.baseline_curve_json.length > 0) {
      baselinePathD = `M ${getX(baselinePoints[0].days)} ${getY(baselinePoints[0].probability)}`;
      baselinePoints.forEach(pt => {
        baselinePathD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
      });
    }

    let pathD = `M ${getX(points[0].days)} ${getY(points[0].probability)}`;
    let areaD = `M ${getX(points[0].days)} ${getY(0)}`;

    points.forEach(pt => {
      pathD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
      areaD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
    });

    areaD += ` L ${getX(points[points.length - 1].days)} ${getY(0)} Z`;

    let comparePathD = '';
    if (comparePoints.length > 0) {
      comparePathD = `M ${getX(comparePoints[0].days)} ${getY(comparePoints[0].probability)}`;
      comparePoints.forEach(pt => {
        comparePathD += ` L ${getX(pt.days)} ${getY(pt.probability)}`;
      });
    }

    const userDays = selectedCase ? calculateDaysElapsed(selectedCase.filed_date, selectedCase.completed_date) : 0;
    let userX = getX(userDays);
    if (userDays > maxDays) {
      userX = getX(maxDays);
    }

    const closestPoint = points.reduce((prev, curr) => {
      return (Math.abs(curr.days - userDays) < Math.abs(prev.days - userDays) ? curr : prev);
    });
    const userProbY = getY(closestPoint.probability);

    return (
      <div className="chart-container" style={{ position: 'relative', height: 'auto' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--secondary)" />
            </linearGradient>
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--bg-dark)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1.0].map((tick, i) => (
            <g key={i}>
              <line x1={paddingLeft} y1={getY(tick)} x2={width - paddingRight} y2={getY(tick)} className="chart-grid-line" />
              <text x={paddingLeft - 10} y={getY(tick) + 4} textAnchor="end" className="chart-text">
                {tick * 100}%
              </text>
            </g>
          ))}

          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
            const dayLabel = Math.round(ratio * maxDays);
            return (
              <text key={i} x={getX(dayLabel)} y={height - 8} textAnchor="middle" className="chart-text">
                {dayLabel}d
              </text>
            );
          })}

          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} className="chart-axis-line" />
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} className="chart-axis-line" />

          {baselinePathD && (
            <path d={baselinePathD} fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
          )}

          <path d={areaD} className="chart-area" />
          <path d={pathD} className="chart-line" />

          {comparePathD && (
            <path d={comparePathD} fill="none" stroke="var(--secondary)" strokeWidth="2" strokeDasharray="4 4" />
          )}

          {adjustedMedian && (
            <g>
              <line x1={getX(adjustedMedian)} y1={paddingTop} x2={getX(adjustedMedian)} y2={height - paddingBottom} stroke="var(--primary)" strokeWidth="1.2" strokeDasharray="3 3" />
              <text x={getX(adjustedMedian) + 5} y={paddingTop + 12} fill="var(--primary)" fontSize="0.7rem" fontWeight="600">
                Median: {adjustedMedian}d
              </text>
            </g>
          )}

          {comparePredictionData?.median_wait_days && (
            <g>
              <line x1={getX(comparePredictionData.median_wait_days)} y1={paddingTop} x2={getX(comparePredictionData.median_wait_days)} y2={height - paddingBottom} stroke="var(--secondary)" strokeWidth="1.2" strokeDasharray="3 3" />
              <text x={getX(comparePredictionData.median_wait_days) + 5} y={paddingTop + 24} fill="var(--secondary)" fontSize="0.7rem" fontWeight="600">
                Compare Median: {comparePredictionData.median_wait_days}d
              </text>
            </g>
          )}

          {selectedCase && (
            <g>
              <line x1={userX} y1={userProbY} x2={userX} y2={height - paddingBottom} stroke={isLightMode ? "var(--text-primary)" : "#fff"} strokeWidth="1.2" strokeDasharray="3 2" />
              <circle 
                cx={userX} 
                cy={userProbY} 
                r="5" 
                className="chart-marker"
                onMouseEnter={() => {
                  setChartTooltip({
                    x: userX,
                    y: userProbY - 30,
                    content: `Day ${userDays}: ${(closestPoint.probability * 100).toFixed(0)}% Approval Chance`,
                    visible: true
                  });
                }}
                onMouseLeave={() => setChartTooltip({ ...chartTooltip, visible: false })}
              />
              <text x={userX + (userX > width - 100 ? -8 : 8)} y={height - paddingBottom - 8} textAnchor={userX > width - 100 ? "end" : "start"} fill={isLightMode ? "var(--text-primary)" : "#fff"} fontSize="0.75rem" fontWeight="700">
                You: {userDays}d
              </text>
            </g>
          )}
        </svg>

        {chartTooltip.visible && (
          <div className="chart-tooltip" style={{ display: 'block', left: `${chartTooltip.x}px`, top: `${chartTooltip.y}px`, transform: 'translateX(-50%)', zIndex: 10 }}>
            {chartTooltip.content}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center', marginTop: '1rem', padding: '0.4rem 0', flexWrap: 'wrap', borderTop: '1px solid var(--border-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: '500' }}>
              {predictionData.service_center} (Adjusted)
            </span>
          </div>
          {predictionData.baseline_curve_json && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '0px', borderTop: '1.5px dashed var(--text-muted)' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: '500' }}>
                {predictionData.service_center} (Baseline)
              </span>
            </div>
          )}
          {comparePredictionData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '0px', borderTop: '2px dashed var(--secondary)' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: '500' }}>
                {comparePredictionData.service_center} (Comparison)
              </span>
            </div>
          )}
          {selectedCase && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '1px solid var(--text-primary)', borderRadius: '50%', background: 'var(--secondary)' }} />
              <span style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: '500' }}>
                Your Progress ({userDays} days elapsed)
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const points = getAdjustedCurve(predictionData, selectedCase) || predictionData.survival_curve_json;
  const adjustedP25 = getPercentileDays(points, 0.25);
  const adjustedP50 = getPercentileDays(points, 0.50) || predictionData.median_wait_days;
  const adjustedP75 = getPercentileDays(points, 0.75);
  const adjustedP90 = getPercentileDays(points, 0.90);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '0.8rem', marginBottom: '1rem' }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
          Predictive Timeline Estimator
        </h2>
        
        {/* Service Center Comparison Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Compare with:</span>
          <select 
            className="form-select" 
            style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '28px', minHeight: '28px' }}
            value={compareServiceCenter}
            onChange={(e) => setCompareServiceCenter(e.target.value)}
          >
            <option value="">-- None --</option>
            <option value="National Benefits Center">National Benefits Center</option>
            <option value="Texas Service Center">Texas Service Center</option>
            <option value="California Service Center">California Service Center</option>
            <option value="Nebraska Service Center">Nebraska Service Center</option>
          </select>
        </div>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
        Statistical forecast models mapped via crowdsourced Survival Analysis fitters. Percentiles display expected remaining wait times.
      </p>

      {/* Percentiles stats tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <div className="stat-tile">
          <div className="stat-value">{adjustedP50 ? `${adjustedP50}d` : '--'}</div>
          <div className="stat-label">Median Target (50%)</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{adjustedP25 ? `${adjustedP25}d` : '--'}</div>
          <div className="stat-label">Fast Track (25%)</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{adjustedP75 ? `${adjustedP75}d` : '--'}</div>
          <div className="stat-label">Moderate Delay (75%)</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{adjustedP90 ? `${adjustedP90}d` : '--'}</div>
          <div className="stat-label">Severe Delay (90%)</div>
        </div>
      </div>

      <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
          <span>Probability of Approval Completion</span>
          <span>Days Elapsed from Receipt Date</span>
        </div>
        {renderSurvivalChart()}
      </div>
    </div>
  );
}
