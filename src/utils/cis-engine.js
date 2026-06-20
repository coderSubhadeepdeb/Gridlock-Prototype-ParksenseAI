/**
 * ParkSense AI — CIS Engine
 * Congestion Impact Score calculation and what-if simulation
 */

// CIS weight configuration
const CIS_WEIGHTS = {
  density: 0.25,
  junction: 0.20,
  vehicleSize: 0.15,
  peakHour: 0.15,
  repeat: 0.10,
  severity: 0.15,
};

/**
 * Simulate enforcement: recalculate CIS if certain zones are enforced
 * Returns the estimated overall CIS reduction percentage
 */
export function simulateEnforcement(zones, enforcedIndices, reductionFactor = 0.6) {
  if (!zones || zones.length === 0) return { totalBefore: 0, totalAfter: 0, reduction: 0 };
  
  let totalBefore = 0;
  let totalAfter = 0;
  
  zones.forEach((zone, i) => {
    totalBefore += zone.cis * zone.count;
    if (enforcedIndices.includes(i)) {
      // Enforcement reduces CIS by reductionFactor
      totalAfter += zone.cis * (1 - reductionFactor) * zone.count;
    } else {
      totalAfter += zone.cis * zone.count;
    }
  });
  
  const reduction = totalBefore > 0 ? ((totalBefore - totalAfter) / totalBefore) * 100 : 0;
  
  return {
    totalBefore: Math.round(totalBefore),
    totalAfter: Math.round(totalAfter),
    reduction: Math.round(reduction * 10) / 10,
  };
}

/**
 * Calculate enforcement ROI for a specific zone
 */
export function calculateROI(zone, allZones) {
  if (!zone || !allZones) return { score: 0, label: '' };
  
  const totalCISWeight = allZones.reduce((sum, z) => sum + z.cis * z.count, 0);
  const zoneWeight = zone.cis * zone.count;
  const impactPercent = totalCISWeight > 0 ? (zoneWeight / totalCISWeight) * 100 : 0;
  
  // ROI considers: high CIS + high count = high ROI
  const roi = zone.cis * Math.log2(zone.count + 1);
  
  return {
    impactPercent: Math.round(impactPercent * 10) / 10,
    roi: Math.round(roi * 10) / 10,
    estimatedReduction: Math.round(impactPercent * 0.6 * 10) / 10,
  };
}

/**
 * Get best enforcement shift hours for a zone
 */
export function getBestShiftHours(zone) {
  if (!zone || !zone.hours) return [];
  
  const hours = Object.entries(zone.hours)
    .map(([h, c]) => ({ hour: parseInt(h), count: c }))
    .sort((a, b) => b.count - a.count);
  
  // Find contiguous peak windows
  const topHours = hours.slice(0, 6).map(h => h.hour).sort((a, b) => a - b);
  
  // Group into shifts
  const shifts = [];
  let start = topHours[0];
  let end = topHours[0];
  
  for (let i = 1; i < topHours.length; i++) {
    if (topHours[i] - end <= 2) {
      end = topHours[i];
    } else {
      shifts.push({ start, end: end + 1, duration: end - start + 1 });
      start = topHours[i];
      end = topHours[i];
    }
  }
  shifts.push({ start, end: end + 1, duration: end - start + 1 });
  
  return shifts;
}

/**
 * Predict violations for a given hour based on historical patterns
 */
export function predictViolations(hourlyData, targetHour, targetDay) {
  if (!hourlyData) return 0;
  
  const hourStr = String(targetHour);
  const dayStr = String(targetDay);
  
  if (hourlyData[hourStr] && hourlyData[hourStr][dayStr]) {
    return hourlyData[hourStr][dayStr];
  }
  
  // Fallback: average across all days for that hour
  if (hourlyData[hourStr]) {
    const values = Object.values(hourlyData[hourStr]);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }
  
  return 0;
}
