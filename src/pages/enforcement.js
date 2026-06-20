/**
 * ParkSense AI — Enforcement Intelligence Page
 * Patrol dispatch optimizer, ROI calculator, shift planner
 */

import { getCISClass, formatNumber, getHourLabel } from '../utils/data-loader.js';
import { calculateROI, getBestShiftHours } from '../utils/cis-engine.js';

let charts = [];

export function render(container, data) {
  const { zones, summary } = data;
  const topZones = zones.zones.slice(0, 20);
  
  // Calculate ROI for each zone
  const zonesWithROI = topZones.map(zone => ({
    ...zone,
    roi: calculateROI(zone, zones.zones),
    shifts: getBestShiftHours(zone),
  }));
  
  // Sort by ROI (highest impact first)
  zonesWithROI.sort((a, b) => b.roi.roi - a.roi.roi);
  
  container.innerHTML = `
    <!-- Stats -->
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card accent-indigo animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Priority Zones</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11.25 5.17-1.1 9-6 9-11.25V7l-9-5z"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${zonesWithROI.filter(z => z.cis >= 40).length}</div>
        <div class="stat-card-sub">zones with CIS ≥ 40</div>
      </div>
      
      <div class="stat-card accent-rose animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Top Zone CIS</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${zonesWithROI[0]?.cis?.toFixed(1) || 0}</div>
        <div class="stat-card-sub">${zonesWithROI[0]?.police_stations?.[0] || 'N/A'}</div>
      </div>
      
      <div class="stat-card accent-emerald animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Max Impact</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${zonesWithROI[0]?.roi?.estimatedReduction?.toFixed(1) || 0}%</div>
        <div class="stat-card-sub">congestion reduction potential</div>
      </div>
      
      <div class="stat-card accent-amber animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Stations Involved</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${new Set(zonesWithROI.flatMap(z => z.police_stations)).size}</div>
        <div class="stat-card-sub">police stations to deploy</div>
      </div>
    </div>
    
    <!-- Dispatch Table -->
    <div class="card animate-in" style="margin-bottom: 20px;">
      <div class="card-header">
        <span class="card-title">🎯 Patrol Dispatch Priority Queue</span>
        <span class="card-badge">Ranked by Enforcement ROI</span>
      </div>
      <div class="card-body no-padding">
        <div style="overflow-x: auto;">
          <table class="data-table" id="dispatch-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Zone / Station</th>
                <th>CIS Score</th>
                <th>Violations</th>
                <th>Impact %</th>
                <th>Est. Reduction</th>
                <th>Best Shift</th>
                <th>Top Violation</th>
                <th>Top Vehicle</th>
              </tr>
            </thead>
            <tbody>
              ${zonesWithROI.slice(0, 15).map((zone, i) => {
                const cisClass = getCISClass(zone.cis);
                const shiftStr = zone.shifts.length > 0 
                  ? zone.shifts.map(s => `${getHourLabel(s.start)}-${getHourLabel(s.end)}`).join(', ')
                  : 'All day';
                
                return `
                  <tr>
                    <td><span class="zone-rank" style="width:24px;height:24px;font-size:0.7rem;">${i + 1}</span></td>
                    <td>
                      <div style="font-weight:600;color:var(--text-primary);">${zone.police_stations?.[0] || 'Zone'}</div>
                      <div style="font-size:0.65rem;color:var(--text-tertiary);">${zone.junction_names?.[0] || 'General area'}</div>
                    </td>
                    <td><span class="cis-badge ${cisClass}">${zone.cis.toFixed(1)}</span></td>
                    <td class="text-mono">${formatNumber(zone.count)}</td>
                    <td class="text-mono text-amber">${zone.roi.impactPercent}%</td>
                    <td class="text-mono text-emerald">${zone.roi.estimatedReduction}%</td>
                    <td><span class="tag primary">${shiftStr}</span></td>
                    <td><span class="tag danger">${zone.dominant_violation}</span></td>
                    <td><span class="tag">${zone.dominant_vehicle}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- ROI Cards -->
    <div class="section-title animate-in">
      <span>Top 6 Enforcement ROI Zones</span>
      <span class="highlight">— Where 1 patrol car makes the biggest difference</span>
    </div>
    <div class="dashboard-grid three-col">
      ${zonesWithROI.slice(0, 6).map((zone, i) => {
        const cisClass = getCISClass(zone.cis);
        const shiftStr = zone.shifts.length > 0 
          ? zone.shifts.map(s => `${getHourLabel(s.start)}-${getHourLabel(s.end)}`).join(', ')
          : 'All day';
        
        return `
          <div class="roi-card animate-in">
            <div class="roi-header">
              <span class="roi-zone-name">${zone.police_stations?.[0] || 'Zone ' + (i+1)}</span>
              <span class="cis-badge ${cisClass}">${zone.cis.toFixed(1)}</span>
            </div>
            <div class="roi-metric">
              <span class="roi-value">${zone.roi.estimatedReduction}%</span>
              <span class="roi-label">congestion reduction</span>
            </div>
            <div style="margin-bottom:12px;">
              <div class="progress-bar">
                <div class="progress-fill ${cisClass === 'critical' ? 'rose' : cisClass === 'high' ? 'amber' : 'indigo'}" style="width: ${Math.min(zone.roi.impactPercent * 5, 100)}%"></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div class="cluster-stat">
                <div class="cluster-stat-value">${formatNumber(zone.count)}</div>
                <div>violations</div>
              </div>
              <div class="cluster-stat">
                <div class="cluster-stat-value">${shiftStr}</div>
                <div>best shift</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    
    <!-- Shift Planning Chart -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">Optimal Shift Planning</span>
        <span class="card-badge">Top 5 Zones × 24 Hours</span>
      </div>
      <div class="card-body">
        <div class="chart-container tall">
          <canvas id="chart-shift-plan"></canvas>
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => initShiftChart(zonesWithROI.slice(0, 5)), 150);
}

function initShiftChart(topZones) {
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.08)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  
  const ctx = document.getElementById('chart-shift-plan');
  if (!ctx) return;
  
  const colors = ['#f43f5e', '#f97316', '#f59e0b', '#6366f1', '#06b6d4'];
  
  const datasets = topZones.map((zone, i) => {
    const hourData = Array.from({ length: 24 }, (_, h) => zone.hours?.[h] || 0);
    
    return {
      label: zone.police_stations?.[0] || `Zone ${i + 1}`,
      data: hourData,
      borderColor: colors[i],
      backgroundColor: colors[i] + '20',
      borderWidth: 2,
      fill: false,
      tension: 0.4,
      pointRadius: 2,
      pointHoverRadius: 5,
    };
  });
  
  const hourLabels = Array.from({ length: 24 }, (_, i) => getHourLabel(i));
  
  charts.push(new Chart(ctx, {
    type: 'line',
    data: { labels: hourLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { padding: 16, boxWidth: 12, font: { size: 11 } },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 9 } } },
        y: { grid: { color: 'rgba(148,163,184,0.05)' }, title: { display: true, text: 'Violations', font: { size: 10 } } },
      },
      interaction: { intersect: false, mode: 'index' },
    },
  }));
}

export function cleanup() {
  charts.forEach(c => c.destroy());
  charts = [];
}
