/**
 * ParkSense AI — Reports & Analytics Page
 * Detailed police station reporting, validation statistics, and data exports
 */

import { getCISClass, formatNumber, getHourLabel } from '../utils/data-loader.js';

let charts = [];
let currentStationIndex = 0;

export function render(container, data) {
  const { summary } = data;
  const stations = summary.police_stations || [];
  
  if (stations.length === 0) {
    container.innerHTML = `<div class="card"><div class="card-body">No station data available.</div></div>`;
    return;
  }
  
  // Calculate city-wide validation statistics
  let totalApproved = 0;
  let totalRejected = 0;
  let totalPending = 0;
  
  stations.forEach(s => {
    totalApproved += s.approved || 0;
    totalRejected += s.rejected || 0;
    totalPending += s.pending || 0;
  });
  
  const totalWithValidation = totalApproved + totalRejected + totalPending;
  const cityApprovalRate = totalWithValidation > 0 
    ? ((totalApproved / totalWithValidation) * 100).toFixed(1)
    : '0.0';
    
  container.innerHTML = `
    <!-- Summary Stats -->
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card accent-indigo animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Total Stations</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 10 7.75"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${stations.length}</div>
        <div class="stat-card-sub">enforcing police stations</div>
      </div>
      
      <div class="stat-card accent-emerald animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Avg Approval Rate</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${cityApprovalRate}%</div>
        <div class="stat-card-sub">city-wide validation accuracy</div>
      </div>
      
      <div class="stat-card accent-rose animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Approved Violations</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${formatNumber(totalApproved)}</div>
        <div class="stat-card-sub">valid infractions confirmed</div>
      </div>
      
      <div class="stat-card accent-amber animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Top Enforcer</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
        </div>
        <div class="stat-card-value" style="font-size: 1.15rem; font-weight: 700; height: 38px; display: flex; align-items: center;">
          ${stations[0]?.name.slice(0, 16) || 'None'}
        </div>
        <div class="stat-card-sub">${formatNumber(stations[0]?.count || 0)} violations registered</div>
      </div>
    </div>
    
    <!-- Station Explorer Grid -->
    <div class="dashboard-grid two-col" style="grid-template-columns: 320px 1fr; margin-bottom: 20px;">
      <!-- Station List Side Panel -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Police Station List</span>
          <span class="card-badge">${stations.length} total</span>
        </div>
        <div class="card-body no-padding" style="max-height: 520px; overflow-y: auto;" id="station-sidebar-list">
          ${stations.map((s, idx) => `
            <div class="zone-item station-list-item ${idx === currentStationIndex ? 'active' : ''}" data-station-idx="${idx}" style="cursor: pointer; padding: 12px 16px;">
              <div class="zone-rank" style="width: 24px; height: 24px; font-size: 0.65rem; background: rgba(99,102,241,0.1); color: var(--accent-primary-light); border-radius: 4px;">
                ${idx + 1}
              </div>
              <div class="zone-info" style="margin-left: 12px; flex: 1; min-width: 0;">
                <div class="zone-name" style="font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</div>
                <div class="zone-meta" style="font-size: 0.65rem;">${formatNumber(s.count)} violations · ${s.approval_rate}% app.</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Station Details Panel -->
      <div class="card animate-in" id="station-detail-panel">
        <!-- Rendered dynamically in loadStationDetails -->
      </div>
    </div>
    
    <!-- Charts Row -->
    <div class="dashboard-grid equal" style="margin-bottom: 20px;">
      <!-- Station Comparison Chart -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Top 10 Stations Comparison</span>
          <button class="btn btn-ghost btn-sm" id="btn-export-all">Export All Stats</button>
        </div>
        <div class="card-body">
          <div class="chart-container tall">
            <canvas id="chart-station-comparison"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Validation Status Breakdown -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">City-Wide Validation Metrics</span>
        </div>
        <div class="card-body">
          <div class="chart-container tall">
            <canvas id="chart-city-validation"></canvas>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Initialize Station Explorer Details
  loadStationDetails(stations[currentStationIndex], container);
  
  // Set up event listeners for station selection
  const sidebar = container.querySelector('#station-sidebar-list');
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      const item = e.target.closest('.station-list-item');
      if (!item) return;
      
      sidebar.querySelectorAll('.station-list-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      
      const idx = parseInt(item.dataset.stationIdx);
      currentStationIndex = idx;
      loadStationDetails(stations[idx], container);
    });
  }
  
  // Initialize Charts
  setTimeout(() => {
    initComparisonCharts(stations, totalApproved, totalRejected, totalPending);
    
    // Export All Stats listener
    const exportBtn = document.getElementById('btn-export-all');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => exportAllStationsCSV(stations));
    }
  }, 100);
}

function loadStationDetails(station, container) {
  const detailPanel = document.getElementById('station-detail-panel');
  if (!detailPanel || !station) return;
  
  // Clean up sub charts from previous station details
  destroySubCharts();
  
  const total = station.count;
  const approved = station.approved || 0;
  const rejected = station.rejected || 0;
  const pending = station.pending || 0;
  
  const approvedPct = total > 0 ? ((approved / total) * 100).toFixed(1) : 0;
  const rejectedPct = total > 0 ? ((rejected / total) * 100).toFixed(1) : 0;
  const pendingPct = total > 0 ? ((pending / total) * 100).toFixed(1) : 0;
  
  detailPanel.innerHTML = `
    <div class="card-header" style="border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span class="card-badge" style="background: rgba(99,102,241,0.1); color: var(--accent-primary-light); margin-bottom: 4px; display: inline-block;">STATION PROFILE</span>
        <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">${station.name}</h2>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-export-station" style="padding: 6px 12px; font-size: 0.75rem;">Export Station Profile</button>
    </div>
    <div class="card-body">
      <!-- Validation Status Breakdown -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: 12px; font-weight: 600;">Validation breakdown</h3>
        <div style="display: flex; height: 16px; border-radius: 8px; overflow: hidden; background: rgba(148,163,184,0.06); margin-bottom: 12px;">
          <div style="width: ${approvedPct}%; background: var(--gradient-success);" title="Approved: ${approvedPct}%"></div>
          <div style="width: ${rejectedPct}%; background: var(--gradient-danger);" title="Rejected: ${rejectedPct}%"></div>
          <div style="width: ${pendingPct}%; background: var(--gradient-warning);" title="Pending: ${pendingPct}%"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <div style="padding: 10px; background: rgba(16, 185, 129, 0.04); border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.08); text-align: center;">
            <div style="font-size: 0.65rem; color: var(--accent-emerald); font-weight: 600;">APPROVED</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 2px 0;">${formatNumber(approved)}</div>
            <div style="font-size: 0.65rem; color: var(--text-tertiary);">${approvedPct}%</div>
          </div>
          <div style="padding: 10px; background: rgba(244, 63, 94, 0.04); border-radius: 6px; border: 1px solid rgba(244, 63, 94, 0.08); text-align: center;">
            <div style="font-size: 0.65rem; color: var(--accent-rose); font-weight: 600;">REJECTED</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 2px 0;">${formatNumber(rejected)}</div>
            <div style="font-size: 0.65rem; color: var(--text-tertiary);">${rejectedPct}%</div>
          </div>
          <div style="padding: 10px; background: rgba(245, 158, 11, 0.04); border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.08); text-align: center;">
            <div style="font-size: 0.65rem; color: var(--accent-amber); font-weight: 600;">PENDING</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 2px 0;">${formatNumber(pending)}</div>
            <div style="font-size: 0.65rem; color: var(--text-tertiary);">${pendingPct}%</div>
          </div>
        </div>
      </div>
      
      <!-- Breakdown Details -->
      <div class="dashboard-grid equal" style="gap: 16px; margin: 0;">
        <!-- Violations breakdown -->
        <div>
          <h3 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: 12px; font-weight: 600;">Violations Distribution</h3>
          <div class="chart-container small" style="height: 180px;">
            <canvas id="chart-station-violations"></canvas>
          </div>
        </div>
        
        <!-- Vehicles breakdown -->
        <div>
          <h3 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: 12px; font-weight: 600;">Vehicles Involved</h3>
          <div class="chart-container small" style="height: 180px;">
            <canvas id="chart-station-vehicles"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Peak hours hourly profile -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
        <h3 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary); margin-bottom: 12px; font-weight: 600;">Daily Hourly Activity Profile</h3>
        <div style="display: flex; gap: 2px; align-items: flex-end; height: 70px; padding: 4px 0;">
          ${Array.from({ length: 24 }, (_, h) => {
            const val = station.hours?.[h] || 0;
            const maxH = Math.max(...Object.values(station.hours || {0: 1}));
            const heightPct = maxH > 0 ? (val / maxH) * 100 : 0;
            const hourLabel = getHourLabel(h);
            return `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; group; position: relative;">
                <div style="background: var(--gradient-primary); width: 100%; height: ${heightPct}%; border-radius: 2px; opacity: 0.75; transition: opacity var(--transition-fast);" 
                     title="${hourLabel}: ${val} violations"></div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-tertiary); margin-top: 6px;">
          <span>12 AM</span>
          <span>6 AM</span>
          <span>12 PM</span>
          <span>6 PM</span>
          <span>11 PM</span>
        </div>
      </div>
    </div>
  `;
  
  // Set up export listener for single station
  const stationExportBtn = document.getElementById('btn-export-station');
  if (stationExportBtn) {
    stationExportBtn.addEventListener('click', () => exportStationCSV(station));
  }
  
  // Render sub charts
  setTimeout(() => initStationSubCharts(station), 50);
}

let subCharts = [];

function destroySubCharts() {
  subCharts.forEach(c => c.destroy());
  subCharts = [];
}

function initStationSubCharts(station) {
  const ctxV = document.getElementById('chart-station-violations');
  const ctxVeh = document.getElementById('chart-station-vehicles');
  if (!ctxV || !ctxVeh) return;
  
  // Violations Sub Chart
  const vKeys = Object.keys(station.violations || {}).slice(0, 5);
  const vVals = vKeys.map(k => station.violations[k]);
  const vColors = ['#f43f5e', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4'];
  
  subCharts.push(new Chart(ctxV, {
    type: 'pie',
    data: {
      labels: vKeys.map(k => k.length > 15 ? k.slice(0, 12) + '...' : k),
      datasets: [{
        data: vVals,
        backgroundColor: vColors.map(c => c + '22'),
        borderColor: vColors,
        borderWidth: 1.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 8, font: { size: 9 }, padding: 6, color: '#94a3b8' },
        },
      },
    },
  }));
  
  // Vehicles Sub Chart
  const vehKeys = Object.keys(station.vehicles || {}).slice(0, 5);
  const vehVals = vehKeys.map(k => station.vehicles[k]);
  const vehColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
  
  subCharts.push(new Chart(ctxVeh, {
    type: 'bar',
    data: {
      labels: vehKeys,
      datasets: [{
        data: vehVals,
        backgroundColor: vehColors.map(c => c + '33'),
        borderColor: vehColors,
        borderWidth: 1.5,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 8 }, color: '#94a3b8' } },
        y: { grid: { color: 'rgba(148,163,184,0.04)' }, ticks: { font: { size: 8 }, color: '#94a3b8', maxTicksLimit: 5 } },
      },
    },
  }));
}

function initComparisonCharts(stations, approved, rejected, pending) {
  // Chart defaults
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.08)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  
  // 1. Comparison of top 10 stations
  const ctxComp = document.getElementById('chart-station-comparison');
  if (ctxComp) {
    const top10 = stations.slice(0, 10);
    charts.push(new Chart(ctxComp, {
      type: 'bar',
      data: {
        labels: top10.map(s => s.name.length > 15 ? s.name.slice(0, 12) + '...' : s.name),
        datasets: [
          {
            label: 'Approved',
            data: top10.map(s => s.approved || 0),
            backgroundColor: 'rgba(16, 185, 129, 0.3)',
            borderColor: '#10b981',
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Rejected',
            data: top10.map(s => s.rejected || 0),
            backgroundColor: 'rgba(244, 63, 94, 0.3)',
            borderColor: '#f43f5e',
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, grid: { color: 'rgba(148,163,184,0.05)' } },
        },
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, padding: 12 } },
        },
      },
    }));
  }
  
  // 2. City-wide validation doughnut
  const ctxVal = document.getElementById('chart-city-validation');
  if (ctxVal) {
    charts.push(new Chart(ctxVal, {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Rejected', 'Pending Review'],
        datasets: [{
          data: [approved, rejected, pending],
          backgroundColor: [
            'rgba(16, 185, 129, 0.25)',
            'rgba(244, 63, 94, 0.25)',
            'rgba(245, 158, 11, 0.25)'
          ],
          borderColor: ['#10b981', '#f43f5e', '#f59e0b'],
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16 } },
        },
      },
    }));
  }
}

// Client-Side CSV Export functions
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportStationCSV(station) {
  let csv = 'Field,Value\r\n';
  csv += `Station Name,${station.name}\r\n`;
  csv += `Total Violations,${station.count}\r\n`;
  csv += `Approved,${station.approved || 0}\r\n`;
  csv += `Rejected,${station.rejected || 0}\r\n`;
  csv += `Pending,${station.pending || 0}\r\n`;
  csv += `Approval Rate %,${station.approval_rate}\r\n\r\n`;
  
  csv += 'Violation Type,Count\r\n';
  Object.entries(station.violations || {}).forEach(([k, v]) => {
    csv += `"${k}",${v}\r\n`;
  });
  csv += '\r\n';
  
  csv += 'Vehicle Type,Count\r\n';
  Object.entries(station.vehicles || {}).forEach(([k, v]) => {
    csv += `"${k}",${v}\r\n`;
  });
  csv += '\r\n';
  
  csv += 'Hour,Violations Count\r\n';
  for (let h = 0; h < 24; h++) {
    csv += `${h},${station.hours?.[h] || 0}\r\n`;
  }
  
  downloadCSV(csv, `${station.name.replace(/\s+/g, '_')}_profile_report.csv`);
}

function exportAllStationsCSV(stations) {
  let csv = 'Rank,Police Station,Total Violations,Approved,Rejected,Pending,Approval Rate %\r\n';
  stations.forEach((s, idx) => {
    csv += `${idx + 1},"${s.name}",${s.count},${s.approved || 0},${s.rejected || 0},${s.pending || 0},${s.approval_rate}\r\n`;
  });
  
  downloadCSV(csv, 'parksense_ai_all_stations_performance.csv');
}

export function cleanup() {
  charts.forEach(c => c.destroy());
  charts = [];
  destroySubCharts();
}
