/**
 * ParkSense AI — Command Center Page
 * Main dashboard with heatmap, stats, and top zones
 */

import { getCISClass, formatNumber, getHourLabel } from '../utils/data-loader.js';

let map = null;
let heatLayer = null;
let markersLayer = null;
let currentFilterHour = -1; // -1 means all hours

export function render(container, data) {
  const { summary, zones } = data;
  
  const totalViolations = summary.total_violations;
  const totalZones = summary.total_zones;
  const totalClusters = summary.total_clusters;
  const avgPerDay = summary.avg_violations_per_day;
  const topZone = summary.top_zones[0];
  
  container.innerHTML = `
    <!-- Stats Row -->
    <div class="stats-grid">
      <div class="stat-card accent-indigo animate-in" id="stat-total">
        <div class="stat-card-header">
          <span class="stat-card-label">Total Violations</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
        </div>
        <div class="stat-card-value counter-animate" data-target="${totalViolations}">${formatNumber(totalViolations)}</div>
        <div class="stat-card-sub">${summary.date_range.start} to ${summary.date_range.end}</div>
      </div>
      
      <div class="stat-card accent-rose animate-in" id="stat-hotspots">
        <div class="stat-card-header">
          <span class="stat-card-label">Hotspot Clusters</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity="0.5"/><circle cx="12" cy="12" r="10" opacity="0.3"/></svg>
          </div>
        </div>
        <div class="stat-card-value counter-animate">${totalClusters}</div>
        <div class="stat-card-sub">AI-detected congestion clusters</div>
      </div>
      
      <div class="stat-card accent-amber animate-in" id="stat-daily">
        <div class="stat-card-header">
          <span class="stat-card-label">Daily Average</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
        </div>
        <div class="stat-card-value counter-animate">${formatNumber(Math.round(avgPerDay))}</div>
        <div class="stat-card-sub">violations per day</div>
      </div>
      
      <div class="stat-card accent-cyan animate-in" id="stat-zones">
        <div class="stat-card-header">
          <span class="stat-card-label">Active Zones</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
        <div class="stat-card-value counter-animate">${formatNumber(totalZones)}</div>
        <div class="stat-card-sub">micro-zones across Bengaluru</div>
      </div>
      
      <div class="stat-card accent-emerald animate-in" id="stat-peak">
        <div class="stat-card-header">
          <span class="stat-card-label">Peak Hour</span>
          <div class="stat-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
          </div>
        </div>
        <div class="stat-card-value counter-animate">${getHourLabel(summary.peak_hour_city)}</div>
        <div class="stat-card-sub">highest violation activity</div>
      </div>
    </div>
    
    <!-- Time Slider -->
    <div class="time-slider-container animate-in" id="time-slider-section">
      <div class="time-slider-header">
        <span class="time-slider-label">Filter by Hour of Day</span>
        <span class="time-slider-value" id="time-display">All Hours</span>
      </div>
      <input type="range" class="time-slider" id="hour-slider" min="-1" max="23" value="-1" step="1" />
      <div class="time-labels">
        <span class="time-label-tick">All</span>
        <span class="time-label-tick">6 AM</span>
        <span class="time-label-tick">12 PM</span>
        <span class="time-label-tick">6 PM</span>
        <span class="time-label-tick">11 PM</span>
      </div>
    </div>
    
    <!-- Map + Zones Grid -->
    <div class="dashboard-grid two-col">
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Congestion Impact Heatmap</span>
          <div class="flex gap-2">
            <span class="card-badge" id="map-point-count">${zones.all_heatmap_points.length} zones</span>
          </div>
        </div>
        <div class="card-body no-padding">
          <div class="map-container full-height" id="command-map"></div>
        </div>
      </div>
      
      <div class="card animate-in">
        <div class="card-header">
          <span class="card-title">Top Critical Zones</span>
          <span class="card-badge">by CIS Score</span>
        </div>
        <div class="card-body no-padding" style="max-height: calc(100vh - 380px); overflow-y: auto;">
          <div id="top-zones-list">
            ${renderTopZones(summary.top_zones)}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Initialize map
  setTimeout(() => initMap(data), 100);
  
  // Time slider
  const slider = document.getElementById('hour-slider');
  const timeDisplay = document.getElementById('time-display');
  if (slider) {
    slider.addEventListener('input', (e) => {
      const hour = parseInt(e.target.value);
      currentFilterHour = hour;
      timeDisplay.textContent = hour === -1 ? 'All Hours' : getHourLabel(hour);
      updateHeatmap(data, hour);
    });
  }
}

function renderTopZones(topZones) {
  return topZones.map((zone, i) => {
    const cisClass = getCISClass(zone.cis);
    const stationName = zone.police_stations?.[0] || 'Unknown';
    const junctionName = zone.junction_names?.[0] || 'No Junction';
    
    return `
      <div class="zone-item" data-lat="${zone.lat}" data-lng="${zone.lng}">
        <div class="zone-rank">${i + 1}</div>
        <div class="zone-info">
          <div class="zone-name">${stationName}</div>
          <div class="zone-meta">${junctionName} · ${formatNumber(zone.count)} violations · ${zone.dominant_vehicle}</div>
        </div>
        <div class="zone-cis">
          <span class="cis-badge ${cisClass}">${zone.cis.toFixed(1)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function initMap(data) {
  const mapEl = document.getElementById('command-map');
  if (!mapEl || map) return;
  
  // Dark tile layer
  map = L.map(mapEl, {
    center: [12.97, 77.59],
    zoom: 12,
    zoomControl: true,
    attributionControl: false,
  });
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
  }).addTo(map);
  
  // Heatmap layer
  updateHeatmap(data, -1);
  
  // Click on zone items to zoom
  document.querySelectorAll('.zone-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      map.setView([lat, lng], 16);
    });
  });
}

function updateHeatmap(data, filterHour) {
  if (!map) return;
  
  const { zones } = data;
  let points;
  
  if (filterHour === -1) {
    // Show all points
    points = zones.all_heatmap_points.map(p => [p[0], p[1], p[2]]);
  } else {
    // Filter zones that have activity in the given hour
    points = zones.zones
      .filter(z => z.hours && z.hours[filterHour] > 0)
      .map(z => [z.lat, z.lng, z.hours[filterHour] * (z.cis / 50)]);
  }
  
  if (heatLayer) {
    map.removeLayer(heatLayer);
  }
  
  heatLayer = L.heatLayer(points, {
    radius: 18,
    blur: 20,
    maxZoom: 15,
    max: 80,
    gradient: {
      0.0: '#1a1a2e',
      0.2: '#6366f1',
      0.4: '#8b5cf6',
      0.6: '#f59e0b',
      0.8: '#f97316',
      1.0: '#f43f5e',
    },
  }).addTo(map);
  
  // Update counter
  const countEl = document.getElementById('map-point-count');
  if (countEl) {
    countEl.textContent = `${points.length} zones`;
  }
  
  // Add cluster markers for top zones
  if (markersLayer) {
    map.removeLayer(markersLayer);
  }
  
  markersLayer = L.layerGroup();
  
  const topZones = data.summary.top_zones.slice(0, 10);
  topZones.forEach((zone, i) => {
    const cisClass = getCISClass(zone.cis);
    const color = cisClass === 'critical' ? '#f43f5e' : cisClass === 'high' ? '#f97316' : '#f59e0b';
    
    const marker = L.circleMarker([zone.lat, zone.lng], {
      radius: 8 + Math.min(zone.count / 100, 8),
      fillColor: color,
      fillOpacity: 0.7,
      color: color,
      weight: 2,
      opacity: 0.9,
    });
    
    marker.bindPopup(`
      <div class="popup-content">
        <div class="popup-title">#${i + 1} — ${zone.police_stations?.[0] || 'Zone'}</div>
        <div class="popup-row"><span class="popup-label">CIS Score</span><span class="popup-value" style="color: ${color}">${zone.cis.toFixed(1)}</span></div>
        <div class="popup-row"><span class="popup-label">Violations</span><span class="popup-value">${formatNumber(zone.count)}</span></div>
        <div class="popup-row"><span class="popup-label">Top Vehicle</span><span class="popup-value">${zone.dominant_vehicle}</span></div>
        <div class="popup-row"><span class="popup-label">Top Violation</span><span class="popup-value">${zone.dominant_violation}</span></div>
      </div>
    `);
    
    markersLayer.addLayer(marker);
  });
  
  markersLayer.addTo(map);
}

export function cleanup() {
  if (map) {
    map.remove();
    map = null;
    heatLayer = null;
    markersLayer = null;
  }
}
