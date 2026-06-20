/**
 * ParkSense AI — Main Application Entry & Routing
 */

import { loadAllData } from './utils/data-loader.js';
import * as commandCenter from './pages/command-center.js';
import * as hotspotAnalytics from './pages/hotspot-analytics.js';
import * as enforcement from './pages/enforcement.js';
import * as predictions from './pages/predictions.js';
import * as reports from './pages/reports.js';

// Page Registry
const PAGES = {
  'command-center': {
    module: commandCenter,
    title: 'Command Center'
  },
  'hotspot-analytics': {
    module: hotspotAnalytics,
    title: 'Hotspot Analytics'
  },
  'enforcement': {
    module: enforcement,
    title: 'Enforcement Intelligence'
  },
  'predictions': {
    module: predictions,
    title: 'Predictive Insights'
  },
  'reports': {
    module: reports,
    title: 'Reports & Performance'
  }
};

let appData = null;
let currentPageKey = null;

// Initialize App
async function init() {
  setupDateTime();
  setupSidebar();
  
  // Show global loading screen
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <div class="loading-text">Loading ParkSense AI Intelligence Database...</div>
      <div class="loading-sub">Processing 298K Bengaluru violation logs</div>
    </div>
  `;
  
  // Load data
  appData = await loadAllData();
  
  if (!appData || !appData.summary) {
    container.innerHTML = `
      <div class="loading-overlay error">
        <div class="error-icon">⚠️</div>
        <div class="loading-text">Failed to load platform data</div>
        <div class="loading-sub">Please ensure preprocessed JSON files are present in /data directory.</div>
      </div>
    `;
    return;
  }
  
  // Setup Router
  window.addEventListener('hashchange', handleRouting);
  
  // Trigger initial routing
  handleRouting();
}

// Router Handler
function handleRouting() {
  const hash = window.location.hash.replace('#', '') || 'command-center';
  const page = PAGES[hash];
  
  if (!page) {
    console.error(`Page not found for hash: ${hash}`);
    window.location.hash = '#command-center';
    return;
  }
  
  // Clean up current page if exists
  if (currentPageKey && PAGES[currentPageKey] && PAGES[currentPageKey].module.cleanup) {
    try {
      PAGES[currentPageKey].module.cleanup();
    } catch (e) {
      console.error(`Error cleaning up page ${currentPageKey}:`, e);
    }
  }
  
  currentPageKey = hash;
  
  // Update Top Bar Title
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = page.title;
  
  // Update Sidebar Active Link
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('data-page') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  
  // Render new page
  const container = document.getElementById('page-container');
  container.innerHTML = '';
  
  try {
    page.module.render(container, appData);
  } catch (err) {
    console.error(`Error rendering page ${hash}:`, err);
    container.innerHTML = `
      <div class="card animate-in" style="margin-top: 20px; border-color: var(--accent-rose);">
        <div class="card-body" style="text-align: center; padding: 40px;">
          <div style="font-size: 2.5rem; margin-bottom: 16px;">⚠️</div>
          <h3 style="color: var(--accent-rose); font-size: 1.1rem; font-weight: 700; margin-bottom: 8px;">Interface Rendering Error</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; max-width: 500px; margin: 0 auto 16px;">
            An error occurred while compiling the dashboard layout for this page:
          </p>
          <pre style="background: rgba(10, 14, 26, 0.5); padding: 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-rose); text-align: left; overflow-x: auto; max-width: 600px; margin: 0 auto;">${err.stack || err.message}</pre>
        </div>
      </div>
    `;
  }
  
  // Scroll to top
  container.scrollTop = 0;
}

// Top Bar Time/Date updater
function setupDateTime() {
  const display = document.getElementById('datetime-display');
  if (!display) return;
  
  const update = () => {
    const now = new Date();
    display.textContent = now.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };
  
  update();
  setInterval(update, 1000);
}

// Sidebar toggle handler (mobile responsive layout support)
function setupSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  
  if (toggle && sidebar) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
        sidebar.classList.remove('open');
      }
    });
    
    // Close sidebar on link clicks (mobile viewport sizes)
    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('.nav-link') && window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  }
}

// Start application
document.addEventListener('DOMContentLoaded', init);
