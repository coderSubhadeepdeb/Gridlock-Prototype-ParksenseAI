/**
 * ParkSense AI — Data Loader
 * Loads preprocessed JSON data files
 */

const DATA_BASE = '/data';

let cache = {};

export async function loadJSON(filename) {
  if (cache[filename]) return cache[filename];
  
  try {
    const resp = await fetch(`${DATA_BASE}/${filename}`);
    if (!resp.ok) throw new Error(`Failed to load ${filename}: ${resp.status}`);
    const data = await resp.json();
    cache[filename] = data;
    return data;
  } catch (err) {
    console.error(`Error loading ${filename}:`, err);
    return null;
  }
}

export async function loadAllData() {
  const [summary, zones, clusters, hourly] = await Promise.all([
    loadJSON('violations_summary.json'),
    loadJSON('zone_stats.json'),
    loadJSON('clusters.json'),
    loadJSON('hourly_patterns.json'),
  ]);
  
  return { summary, zones, clusters, hourly };
}

export function getCISClass(cis) {
  if (cis >= 60) return 'critical';
  if (cis >= 40) return 'high';
  if (cis >= 20) return 'medium';
  return 'low';
}

export function getCISLabel(cis) {
  if (cis >= 60) return 'Critical';
  if (cis >= 40) return 'High';
  if (cis >= 20) return 'Medium';
  return 'Low';
}

export function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

export function getHourLabel(hour) {
  const h = parseInt(hour);
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return h + ' AM';
  return (h - 12) + ' PM';
}
