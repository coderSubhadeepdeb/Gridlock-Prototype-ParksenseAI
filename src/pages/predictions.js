/**
 * ParkSense AI — Predictive Insights Page
 * Forecasting + What-If Simulation
 */

import { getCISClass, formatNumber, getHourLabel } from '../utils/data-loader.js';
import { simulateEnforcement } from '../utils/cis-engine.js';

let charts = [];

export function render(container, data) {
  const { zones, hourly, summary } = data;
  const topZones = zones.zones.slice(0, 10);
  const hourlyCity = hourly?.hourly_city || {};
  
  // Predict next hours based on current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // convert to Mon=0
  
  // Build prediction data: next 8 hours
  const predictions = [];
  for (let offset = 0; offset < 8; offset++) {
    const h = (currentHour + offset) % 24;
    const hourData = hourlyCity[String(h)] || {};
    const dayCount = hourData[String(currentDay)] || 0;
    const avgCount = Object.values(hourData).length > 0 
      ? Math.round(Object.values(hourData).reduce((a, b) => a + b, 0) / Object.values(hourData).length)
      : 0;
    
    predictions.push({
      hour: h,
      label: getHourLabel(h),
      predicted: dayCount || avgCount,
      isNow: offset === 0,
    });
  }
  
  // Day-of-week analysis
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayTotals = dayNames.map((name, dayIdx) => {
    let total = 0;
    Object.values(hourlyCity).forEach(dayMap => {
      total += dayMap[String(dayIdx)] || 0;
    });
    return { name, total };
  });
  
  // Initial simulation state
  const simResult = simulateEnforcement(topZones, []);
  
  container.innerHTML = `
    <!-- Prediction Stats -->
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card accent-indigo animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Predicted Next Hour</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${formatNumber(predictions[1]?.predicted || 0)}</div>
        <div class="stat-card-sub">expected violations at ${predictions[1]?.label || ''}</div>
      </div>
      
      <div class="stat-card accent-amber animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Peak Prediction Today</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${formatNumber(Math.max(...predictions.map(p => p.predicted)))}</div>
        <div class="stat-card-sub">at ${predictions.reduce((max, p) => p.predicted > max.predicted ? p : max, predictions[0]).label}</div>
      </div>
      
      <div class="stat-card accent-rose animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Worst Day of Week</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${dayTotals.reduce((max, d) => d.total > max.total ? d : max, dayTotals[0]).name}</div>
        <div class="stat-card-sub">${formatNumber(dayTotals.reduce((max, d) => d.total > max.total ? d : max, dayTotals[0]).total)} total violations</div>
      </div>
    </div>
    
    <!-- Prediction Charts -->
    <div class="dashboard-grid equal">
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Next 8 Hours Forecast</span>
          <span class="card-badge">Based on Historical Patterns</span>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="chart-forecast"></canvas>
          </div>
        </div>
      </div>
      
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Day-of-Week Analysis</span>
          <span class="card-badge">Weekly Pattern</span>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="chart-weekly"></canvas>
          </div>
        </div>
      </div>
    </div>
    
    <!-- What-If Simulation -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">🔮 What-If Enforcement Simulation</span>
        <span class="card-badge">Toggle zones to see impact</span>
      </div>
      <div class="card-body">
        <div class="dashboard-grid" style="grid-template-columns: 1fr 300px;">
          <div>
            <div class="simulation-panel" id="sim-panel">
              ${topZones.map((zone, i) => {
                const cisClass = getCISClass(zone.cis);
                return `
                  <div class="simulation-zone">
                    <div class="flex items-center gap-3" style="flex:1; min-width:0;">
                      <div class="zone-rank" style="width:24px;height:24px;font-size:0.65rem;">${i+1}</div>
                      <div style="min-width:0;">
                        <div style="font-size:0.8rem;font-weight:600;color:var(--text-primary);">${zone.police_stations?.[0] || 'Zone ' + (i+1)}</div>
                        <div style="font-size:0.65rem;color:var(--text-tertiary);">${formatNumber(zone.count)} violations · CIS: ${zone.cis.toFixed(1)}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <span class="cis-badge ${cisClass}">${zone.cis.toFixed(1)}</span>
                      <div class="sim-toggle" data-zone-idx="${i}" id="sim-toggle-${i}"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <div>
            <div class="roi-card" id="sim-result">
              <div style="text-align:center;margin-bottom:16px;">
                <div style="font-size:0.75rem;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Estimated Congestion Reduction</div>
                <div class="roi-value" id="sim-reduction" style="font-size:3rem;">0%</div>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
                <div style="text-align:center;padding:12px;background:rgba(148,163,184,0.04);border-radius:8px;">
                  <div style="font-size:0.65rem;color:var(--text-tertiary);">Zones Enforced</div>
                  <div style="font-size:1.2rem;font-weight:700;color:var(--accent-primary-light);" id="sim-enforced-count">0</div>
                </div>
                <div style="text-align:center;padding:12px;background:rgba(148,163,184,0.04);border-radius:8px;">
                  <div style="font-size:0.65rem;color:var(--text-tertiary);">CIS Weight Removed</div>
                  <div style="font-size:1.2rem;font-weight:700;color:var(--accent-emerald);" id="sim-weight-removed">0</div>
                </div>
              </div>
              <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle);text-align:center;">
                <div style="font-size:0.7rem;color:var(--text-tertiary);">Each toggled zone simulates sending a patrol car.<br/>60% violation reduction per enforced zone.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Heatmap Grid: Hour vs Day -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">Hour × Day Violation Heatmap</span>
        <span class="card-badge">Pattern Discovery</span>
      </div>
      <div class="card-body">
        <div id="heatmap-grid" style="overflow-x:auto;"></div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    initCharts(predictions, dayTotals);
    initSimulation(topZones);
    initHeatmapGrid(hourlyCity);
  }, 150);
}

function initCharts(predictions, dayTotals) {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.08)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  
  // Forecast chart
  const ctx1 = document.getElementById('chart-forecast');
  if (ctx1) {
    charts.push(new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: predictions.map(p => p.label),
        datasets: [{
          label: 'Predicted Violations',
          data: predictions.map(p => p.predicted),
          backgroundColor: predictions.map(p => 
            p.isNow ? 'rgba(99, 102, 241, 0.5)' : 'rgba(139, 92, 246, 0.3)'
          ),
          borderColor: predictions.map(p => 
            p.isNow ? '#6366f1' : '#8b5cf6'
          ),
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,0.05)' } },
        },
      },
    }));
  }
  
  // Weekly chart
  const ctx2 = document.getElementById('chart-weekly');
  if (ctx2) {
    const maxDay = Math.max(...dayTotals.map(d => d.total));
    charts.push(new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: dayTotals.map(d => d.name),
        datasets: [{
          label: 'Total Violations',
          data: dayTotals.map(d => d.total),
          backgroundColor: dayTotals.map(d => 
            d.total === maxDay ? 'rgba(244, 63, 94, 0.4)' : 'rgba(6, 182, 212, 0.3)'
          ),
          borderColor: dayTotals.map(d => 
            d.total === maxDay ? '#f43f5e' : '#06b6d4'
          ),
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148,163,184,0.05)' } },
        },
      },
    }));
  }
}

function initSimulation(topZones) {
  const enforcedIndices = [];
  
  document.querySelectorAll('.sim-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const idx = parseInt(toggle.dataset.zoneIdx);
      toggle.classList.toggle('active');
      
      if (toggle.classList.contains('active')) {
        if (!enforcedIndices.includes(idx)) enforcedIndices.push(idx);
      } else {
        const pos = enforcedIndices.indexOf(idx);
        if (pos > -1) enforcedIndices.splice(pos, 1);
      }
      
      const result = simulateEnforcement(topZones, enforcedIndices);
      
      // Animate the result
      const reductionEl = document.getElementById('sim-reduction');
      const countEl = document.getElementById('sim-enforced-count');
      const weightEl = document.getElementById('sim-weight-removed');
      
      if (reductionEl) reductionEl.textContent = result.reduction + '%';
      if (countEl) countEl.textContent = enforcedIndices.length;
      if (weightEl) weightEl.textContent = formatNumber(result.totalBefore - result.totalAfter);
    });
  });
}

function initHeatmapGrid(hourlyCity) {
  const container = document.getElementById('heatmap-grid');
  if (!container) return;
  
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Build matrix
  let maxVal = 0;
  const matrix = [];
  for (let h = 0; h < 24; h++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const val = hourlyCity[String(h)]?.[String(d)] || 0;
      row.push(val);
      if (val > maxVal) maxVal = val;
    }
    matrix.push(row);
  }
  
  // Render as table
  let html = '<table style="width:100%;border-collapse:collapse;">';
  html += '<thead><tr><th style="padding:6px 10px;font-size:0.65rem;color:var(--text-muted);text-align:left;">Hour</th>';
  dayNames.forEach(d => {
    html += `<th style="padding:6px 10px;font-size:0.7rem;color:var(--text-tertiary);text-align:center;">${d}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  for (let h = 0; h < 24; h++) {
    html += `<tr><td style="padding:4px 10px;font-size:0.7rem;color:var(--text-tertiary);font-family:var(--font-mono);">${getHourLabel(h)}</td>`;
    for (let d = 0; d < 7; d++) {
      const val = matrix[h][d];
      const intensity = maxVal > 0 ? val / maxVal : 0;
      
      // Color interpolation: dark blue → purple → orange → red
      let r, g, b;
      if (intensity < 0.33) {
        const t = intensity / 0.33;
        r = Math.round(26 + t * 73);
        g = Math.round(26 + t * 40);
        b = Math.round(46 + t * 195);
      } else if (intensity < 0.66) {
        const t = (intensity - 0.33) / 0.33;
        r = Math.round(99 + t * 150);
        g = Math.round(66 + t * 92);
        b = Math.round(241 - t * 219);
      } else {
        const t = (intensity - 0.66) / 0.34;
        r = Math.round(249 - t * 5);
        g = Math.round(158 - t * 95);
        b = Math.round(22 + t * 72);
      }
      
      const bgColor = `rgba(${r},${g},${b},${0.1 + intensity * 0.6})`;
      html += `<td style="padding:4px;text-align:center;">
        <div style="background:${bgColor};border-radius:4px;padding:6px 4px;font-size:0.65rem;font-family:var(--font-mono);color:${intensity > 0.5 ? 'white' : 'var(--text-tertiary)'};">${val > 0 ? formatNumber(val) : '-'}</div>
      </td>`;
    }
    html += '</tr>';
  }
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

export function cleanup() {
  charts.forEach(c => c.destroy());
  charts = [];
}
