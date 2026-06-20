/**
 * ParkSense AI — Hotspot Analytics Page
 * DBSCAN cluster visualization and trend analysis
 */

import { getCISClass, formatNumber, getHourLabel } from '../utils/data-loader.js';

let map = null;
let charts = [];

export function render(container, data) {
  const { clusters, summary, hourly } = data;
  const clusterList = clusters.clusters || [];
  
  // Compute violation type distribution
  const violationDist = summary.violation_distribution || {};
  const vehicleDist = summary.vehicle_distribution || {};
  
  container.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card accent-rose animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Total Clusters</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity="0.5"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${clusterList.length}</div>
        <div class="stat-card-sub">density-based spatial clusters</div>
      </div>
      
      <div class="stat-card accent-amber animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Largest Cluster</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${clusterList.length > 0 ? formatNumber(clusterList[0].total_violations) : 0}</div>
        <div class="stat-card-sub">violations in top cluster</div>
      </div>
      
      <div class="stat-card accent-cyan animate-in">
        <div class="stat-card-header">
          <span class="stat-card-label">Avg CIS Score</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>
          </div>
        </div>
        <div class="stat-card-value">${clusterList.length > 0 ? (clusterList.reduce((s, c) => s + c.avg_cis, 0) / clusterList.length).toFixed(1) : 0}</div>
        <div class="stat-card-sub">across all clusters</div>
      </div>
    </div>
    
    <div class="dashboard-grid two-col">
      <!-- Cluster Map -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Violation Clusters Map</span>
          <span class="card-badge">${clusterList.length} clusters</span>
        </div>
        <div class="card-body no-padding">
          <div class="map-container" id="cluster-map" style="height: 450px;"></div>
        </div>
      </div>
      
      <!-- Cluster List -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Cluster Rankings</span>
          <span class="card-badge">by CIS</span>
        </div>
        <div class="card-body no-padding" style="max-height: 450px; overflow-y: auto;">
          ${clusterList.slice(0, 15).map((c, i) => {
            const cisClass = getCISClass(c.avg_cis);
            return `
              <div class="zone-item" data-lat="${c.center_lat}" data-lng="${c.center_lng}" data-cluster="${i}">
                <div class="zone-rank" style="background: rgba(244,63,94,0.15); color: var(--accent-rose);">C${i + 1}</div>
                <div class="zone-info">
                  <div class="zone-name">${c.police_stations?.[0] || 'Cluster ' + (i + 1)}</div>
                  <div class="zone-meta">${formatNumber(c.total_violations)} violations · ${c.zone_count} zones · ${c.dominant_violation}</div>
                </div>
                <div class="zone-cis">
                  <span class="cis-badge ${cisClass}">${c.avg_cis.toFixed(1)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
    
    <!-- Charts Row -->
    <div class="dashboard-grid three-col" style="margin-top: 20px;">
      <!-- Violation Type Distribution -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Violation Types</span>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="chart-violations"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Vehicle Distribution -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Vehicle Distribution</span>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="chart-vehicles"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Hourly Trend -->
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Hourly Pattern</span>
        </div>
        <div class="card-body">
          <div class="chart-container">
            <canvas id="chart-hourly"></canvas>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Monthly Trend -->
    <div class="card animate-in" style="margin-top: 20px;">
      <div class="card-header">
        <span class="card-title">Daily Violation Trend</span>
        <span class="card-badge">Time Series</span>
      </div>
      <div class="card-body">
        <div class="chart-container tall">
          <canvas id="chart-daily-trend"></canvas>
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    initClusterMap(clusterList);
    initCharts(violationDist, vehicleDist, hourly);
  }, 150);
}

function initClusterMap(clusterList) {
  const mapEl = document.getElementById('cluster-map');
  if (!mapEl) return;
  
  map = L.map(mapEl, {
    center: [12.97, 77.59],
    zoom: 12,
    attributionControl: false,
  });
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);
  
  // Draw clusters as circles
  const colors = ['#f43f5e', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#6366f1'];
  
  clusterList.forEach((cluster, i) => {
    const color = colors[i % colors.length];
    
    // Draw individual zone circles
    cluster.zones.forEach(zone => {
      L.circleMarker([zone.lat, zone.lng], {
        radius: 5 + Math.min(zone.count / 50, 8),
        fillColor: color,
        fillOpacity: 0.4,
        color: color,
        weight: 1,
        opacity: 0.6,
      }).addTo(map);
    });
    
    // Cluster center marker
    const marker = L.circleMarker([cluster.center_lat, cluster.center_lng], {
      radius: 12,
      fillColor: color,
      fillOpacity: 0.8,
      color: 'white',
      weight: 2,
      opacity: 0.9,
    });
    
    marker.bindPopup(`
      <div class="popup-content">
        <div class="popup-title">Cluster #${i + 1}</div>
        <div class="popup-row"><span class="popup-label">Avg CIS</span><span class="popup-value" style="color: ${color}">${cluster.avg_cis.toFixed(1)}</span></div>
        <div class="popup-row"><span class="popup-label">Violations</span><span class="popup-value">${formatNumber(cluster.total_violations)}</span></div>
        <div class="popup-row"><span class="popup-label">Zones</span><span class="popup-value">${cluster.zone_count}</span></div>
        <div class="popup-row"><span class="popup-label">Top Type</span><span class="popup-value">${cluster.dominant_violation}</span></div>
        <div class="popup-row"><span class="popup-label">Top Vehicle</span><span class="popup-value">${cluster.dominant_vehicle}</span></div>
        <div class="popup-row"><span class="popup-label">Stations</span><span class="popup-value">${cluster.police_stations?.join(', ') || '-'}</span></div>
      </div>
    `);
    
    marker.addTo(map);
  });
  
  // Click handler for cluster list items
  document.querySelectorAll('[data-cluster]').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      map.setView([lat, lng], 15);
    });
  });
}

function initCharts(violationDist, vehicleDist, hourly) {
  // Chart defaults
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.borderColor = 'rgba(148, 163, 184, 0.08)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  
  // Violation Type Doughnut
  const violKeys = Object.keys(violationDist).slice(0, 6);
  const violValues = violKeys.map(k => violationDist[k]);
  const violColors = ['#f43f5e', '#f97316', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981'];
  
  const ctx1 = document.getElementById('chart-violations');
  if (ctx1) {
    charts.push(new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: violKeys.map(k => k.length > 20 ? k.slice(0, 18) + '...' : k),
        datasets: [{
          data: violValues,
          backgroundColor: violColors.map(c => c + '33'),
          borderColor: violColors,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, boxWidth: 10, font: { size: 10 } },
          },
        },
      },
    }));
  }
  
  // Vehicle Distribution Bar
  const vehKeys = Object.keys(vehicleDist).slice(0, 8);
  const vehValues = vehKeys.map(k => vehicleDist[k]);
  
  const ctx2 = document.getElementById('chart-vehicles');
  if (ctx2) {
    charts.push(new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: vehKeys,
        datasets: [{
          label: 'Violations',
          data: vehValues,
          backgroundColor: 'rgba(99, 102, 241, 0.3)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(148,163,184,0.05)' } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      },
    }));
  }
  
  // Hourly Pattern Line
  const hourlyCity = hourly?.hourly_city || {};
  const hourLabels = Array.from({ length: 24 }, (_, i) => getHourLabel(i));
  const hourTotals = Array.from({ length: 24 }, (_, i) => {
    const dayData = hourlyCity[String(i)] || {};
    return Object.values(dayData).reduce((sum, v) => sum + v, 0);
  });
  
  const ctx3 = document.getElementById('chart-hourly');
  if (ctx3) {
    charts.push(new Chart(ctx3, {
      type: 'line',
      data: {
        labels: hourLabels,
        datasets: [{
          label: 'Violations',
          data: hourTotals,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#f59e0b',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 9 } } },
          y: { grid: { color: 'rgba(148,163,184,0.05)' }, ticks: { font: { size: 9 } } },
        },
      },
    }));
  }
  
  // Daily Trend Line
  const dailyTrend = hourly?.daily_trend || [];
  const ctx4 = document.getElementById('chart-daily-trend');
  if (ctx4) {
    // Sample every 3rd point if there are too many
    const sampled = dailyTrend.length > 60 
      ? dailyTrend.filter((_, i) => i % 3 === 0) 
      : dailyTrend;
    
    charts.push(new Chart(ctx4, {
      type: 'line',
      data: {
        labels: sampled.map(d => {
          const parts = d.date.split('-');
          return `${parts[1]}/${parts[2]}`;
        }),
        datasets: [{
          label: 'Daily Violations',
          data: sampled.map(d => d.count),
          borderColor: '#6366f1',
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.2)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
            return gradient;
          },
          borderWidth: 2,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 15, font: { size: 9 } },
          },
          y: {
            grid: { color: 'rgba(148,163,184,0.05)' },
            ticks: { font: { size: 9 } },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    }));
  }
}

export function cleanup() {
  if (map) {
    map.remove();
    map = null;
  }
  charts.forEach(c => c.destroy());
  charts = [];
}
