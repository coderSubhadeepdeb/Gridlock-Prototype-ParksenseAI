"""
ParkSense AI — Data Preprocessing Pipeline
Converts raw CSV (298K rows) into optimized JSON files for the frontend dashboard.
"""

import csv
import json
import math
import os
import re
from collections import defaultdict
from datetime import datetime

# ─── Configuration ───────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'jan to may police violation_anonymized791b166 (1).csv')
OUTPUT_DIR = os.path.dirname(__file__)

# Bengaluru bounding box
LAT_MIN, LAT_MAX = 12.85, 13.15
LNG_MIN, LNG_MAX = 77.45, 77.80

# Grid cell size for micro-zones (~200m)
GRID_SIZE = 0.002  # ~200m at Bengaluru's latitude

# Vehicle size impact factors
VEHICLE_SIZE = {
    'BUS': 5.0, 'TANKER': 5.0, 'TRUCK': 5.0, 'TIPPER': 5.0,
    'MAXI-CAB': 4.0, 'GOODS CARRIER': 4.0,
    'CAR': 3.0, 'JEEP': 3.0, 'TAXI': 3.0,
    'PASSENGER AUTO': 2.0, 'GOODS AUTO': 2.0,
    'SCOOTER': 1.0, 'MOTORCYCLE': 1.0, 'MOPED': 1.0, 'BICYCLE': 0.5,
}

# Peak hour multipliers
def get_peak_multiplier(hour):
    if 8 <= hour <= 10:  # Morning peak
        return 2.0
    elif 17 <= hour <= 20:  # Evening peak
        return 2.5
    elif 11 <= hour <= 16:  # Midday
        return 1.5
    else:
        return 1.0

# Violation severity
VIOLATION_SEVERITY = {
    'PARKING NEAR ROAD CROSSING': 3.0,
    'PARKING IN A MAIN ROAD': 2.5,
    'WRONG PARKING': 2.0,
    'NO PARKING': 2.0,
    'PARKING ON FOOTPATH': 1.5,
}

def parse_violation_types(raw):
    """Parse violation_type field like ['WRONG PARKING','NO PARKING']"""
    if not raw or raw == 'NULL':
        return ['UNKNOWN']
    types = re.findall(r'"([^"]+)"', raw)
    if not types:
        types = [raw.strip('[]').strip('"').strip()]
    return [t.strip() for t in types if t.strip()]

def grid_key(lat, lng):
    """Return grid cell key for a lat/lng coordinate"""
    row = int((lat - LAT_MIN) / GRID_SIZE)
    col = int((lng - LNG_MIN) / GRID_SIZE)
    return (row, col)

def grid_center(row, col):
    """Return center lat/lng for a grid cell"""
    lat = LAT_MIN + (row + 0.5) * GRID_SIZE
    lng = LNG_MIN + (col + 0.5) * GRID_SIZE
    return round(lat, 6), round(lng, 6)


def main():
    print("🚀 ParkSense AI Data Pipeline Starting...")
    
    # ─── Pass 1: Read and clean all rows ─────────────────────────
    rows = []
    skipped = 0
    
    print(f"📂 Reading CSV: {CSV_PATH}")
    with open(CSV_PATH, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            try:
                lat = float(row.get('latitude', 0))
                lng = float(row.get('longitude', 0))
            except (ValueError, TypeError):
                skipped += 1
                continue
            
            # Filter to Bengaluru bounding box
            if not (LAT_MIN <= lat <= LAT_MAX and LNG_MIN <= lng <= LNG_MAX):
                skipped += 1
                continue
            
            # Parse datetime
            dt_str = row.get('created_datetime', '')
            try:
                # Handle timezone offset format
                dt_str_clean = re.sub(r'\+\d{2}$', '', dt_str)
                dt = datetime.strptime(dt_str_clean, '%Y-%m-%d %H:%M:%S')
            except (ValueError, TypeError):
                skipped += 1
                continue
            
            violation_types = parse_violation_types(row.get('violation_type', ''))
            vehicle_type = row.get('vehicle_type', 'UNKNOWN').strip()
            if not vehicle_type or vehicle_type == 'NULL':
                vehicle_type = 'UNKNOWN'
            
            # Use updated vehicle type if available (more accurate)
            updated_vt = row.get('updated_vehicle_type', '').strip()
            if updated_vt and updated_vt != 'NULL':
                vehicle_type = updated_vt
            
            police_station = row.get('police_station', 'Unknown').strip()
            if not police_station or police_station == 'NULL':
                police_station = 'Unknown'
            
            junction_name = row.get('junction_name', 'No Junction').strip()
            if not junction_name or junction_name == 'NULL':
                junction_name = 'No Junction'
            
            has_junction = junction_name != 'No Junction'
            
            validation = row.get('validation_status', '').strip()
            
            rows.append({
                'lat': lat,
                'lng': lng,
                'vehicle_type': vehicle_type,
                'violation_types': violation_types,
                'police_station': police_station,
                'junction_name': junction_name,
                'has_junction': has_junction,
                'hour': dt.hour,
                'day_of_week': dt.weekday(),  # 0=Monday
                'month': dt.month,
                'year': dt.year,
                'date_str': dt.strftime('%Y-%m-%d'),
                'validation': validation,
            })
            
            if (i + 1) % 50000 == 0:
                print(f"  Processed {i+1} rows...")
    
    print(f"✅ Loaded {len(rows)} valid rows (skipped {skipped})")
    
    # ─── Aggregate: Grid-based zone statistics ───────────────────
    print("📊 Computing zone statistics...")
    
    zones = defaultdict(lambda: {
        'count': 0,
        'vehicles': defaultdict(int),
        'violations': defaultdict(int),
        'hours': defaultdict(int),
        'days': defaultdict(int),
        'months': defaultdict(int),
        'junction_count': 0,
        'junction_names': set(),
        'police_stations': set(),
        'vehicle_ids': set(),
        'dates': set(),
    })
    
    # Per-station stats
    station_stats = defaultdict(lambda: {
        'count': 0,
        'vehicles': defaultdict(int),
        'violations': defaultdict(int),
        'hours': defaultdict(int),
        'approved': 0,
        'rejected': 0,
        'pending': 0,
    })
    
    # Hourly patterns (city-wide)
    hourly_city = defaultdict(lambda: defaultdict(int))  # hour -> day_of_week -> count
    
    # Daily counts for trend
    daily_counts = defaultdict(int)
    
    # Monthly counts
    monthly_counts = defaultdict(int)
    
    # Vehicle type distribution (city-wide)
    vehicle_dist = defaultdict(int)
    
    # Violation type distribution (city-wide)
    violation_dist = defaultdict(int)
    
    for row in rows:
        gk = grid_key(row['lat'], row['lng'])
        z = zones[gk]
        z['count'] += 1
        z['vehicles'][row['vehicle_type']] += 1
        for vt in row['violation_types']:
            z['violations'][vt] += 1
        z['hours'][row['hour']] += 1
        z['days'][row['day_of_week']] += 1
        z['months'][row['month']] += 1
        if row['has_junction']:
            z['junction_count'] += 1
            z['junction_names'].add(row['junction_name'])
        z['police_stations'].add(row['police_station'])
        z['dates'].add(row['date_str'])
        
        # Station stats
        ss = station_stats[row['police_station']]
        ss['count'] += 1
        ss['vehicles'][row['vehicle_type']] += 1
        for vt in row['violation_types']:
            ss['violations'][vt] += 1
        ss['hours'][row['hour']] += 1
        if row['validation'] == 'approved':
            ss['approved'] += 1
        elif row['validation'] == 'rejected':
            ss['rejected'] += 1
        else:
            ss['pending'] += 1
        
        # City-wide hourly
        hourly_city[row['hour']][row['day_of_week']] += 1
        
        # Daily trend
        daily_counts[row['date_str']] += 1
        
        # Monthly
        monthly_counts[f"{row['year']}-{row['month']:02d}"] += 1
        
        # Distributions
        vehicle_dist[row['vehicle_type']] += 1
        for vt in row['violation_types']:
            violation_dist[vt] += 1
    
    # ─── Compute CIS for each zone ──────────────────────────────
    print("🧮 Computing Congestion Impact Scores...")
    
    max_count = max(z['count'] for z in zones.values()) if zones else 1
    
    zone_data = []
    for (r, c), z in zones.items():
        lat, lng = grid_center(r, c)
        
        # Violation Density (normalized 0-1)
        density = z['count'] / max_count
        
        # Junction Proximity Factor
        junction_ratio = z['junction_count'] / z['count'] if z['count'] > 0 else 0
        junction_factor = junction_ratio * 3.0  # Up to 3x if all near junctions
        junction_factor = min(junction_factor, 1.0)
        
        # Vehicle Size Factor (weighted average)
        total_vehicles = sum(z['vehicles'].values())
        vehicle_size_sum = sum(
            VEHICLE_SIZE.get(vt, 1.0) * count 
            for vt, count in z['vehicles'].items()
        )
        avg_vehicle_size = vehicle_size_sum / total_vehicles if total_vehicles > 0 else 1.0
        vehicle_factor = avg_vehicle_size / 5.0  # Normalize to 0-1
        
        # Peak Hour Factor
        peak_violations = sum(
            count for hour, count in z['hours'].items() 
            if 8 <= int(hour) <= 10 or 17 <= int(hour) <= 20
        )
        peak_ratio = peak_violations / z['count'] if z['count'] > 0 else 0
        peak_factor = peak_ratio * 2.0
        peak_factor = min(peak_factor, 1.0)
        
        # Repeat factor (how many unique dates = persistence)
        date_span = len(z['dates'])
        repeat_factor = min(date_span / 30.0, 1.0)  # Normalize: 30+ days = max
        
        # Violation severity factor
        severity_sum = sum(
            VIOLATION_SEVERITY.get(vt, 1.0) * count
            for vt, count in z['violations'].items()
        )
        total_violations = sum(z['violations'].values())
        avg_severity = severity_sum / total_violations if total_violations > 0 else 1.0
        severity_factor = avg_severity / 3.0  # Normalize
        
        # CIS = weighted composite
        cis = (
            0.25 * density +
            0.20 * junction_factor +
            0.15 * vehicle_factor +
            0.15 * peak_factor +
            0.10 * repeat_factor +
            0.15 * severity_factor
        )
        cis = round(min(cis * 100, 100), 2)  # Scale to 0-100
        
        # Dominant violation type
        dominant_violation = max(z['violations'].items(), key=lambda x: x[1])[0] if z['violations'] else 'UNKNOWN'
        
        # Dominant vehicle type
        dominant_vehicle = max(z['vehicles'].items(), key=lambda x: x[1])[0] if z['vehicles'] else 'UNKNOWN'
        
        # Peak hour
        peak_hour = max(z['hours'].items(), key=lambda x: x[1])[0] if z['hours'] else 0
        
        # Peak day
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        peak_day = max(z['days'].items(), key=lambda x: x[1])[0] if z['days'] else 0
        
        zone_data.append({
            'grid_row': r,
            'grid_col': c,
            'lat': lat,
            'lng': lng,
            'count': z['count'],
            'cis': cis,
            'density': round(density, 4),
            'junction_factor': round(junction_factor, 4),
            'vehicle_factor': round(vehicle_factor, 4),
            'peak_factor': round(peak_factor, 4),
            'repeat_factor': round(repeat_factor, 4),
            'severity_factor': round(severity_factor, 4),
            'dominant_violation': dominant_violation,
            'dominant_vehicle': dominant_vehicle,
            'peak_hour': int(peak_hour),
            'peak_day': day_names[int(peak_day)],
            'junction_names': list(z['junction_names'])[:5],
            'police_stations': list(z['police_stations']),
            'vehicles': dict(z['vehicles']),
            'violations': dict(z['violations']),
            'hours': {int(k): v for k, v in z['hours'].items()},
            'days': {day_names[int(k)]: v for k, v in z['days'].items()},
        })
    
    # Sort by CIS descending
    zone_data.sort(key=lambda x: x['cis'], reverse=True)
    
    # ─── DBSCAN-like clustering (simple density-based) ───────────
    print("🔬 Running spatial clustering...")
    
    # Use a simple grid-based clustering approach
    # Group adjacent high-violation cells into clusters
    high_zones = [z for z in zone_data if z['count'] >= 10]
    
    visited = set()
    clusters = []
    
    def get_neighbors(zone, all_zones, eps=0.005):
        """Find zones within eps distance"""
        neighbors = []
        for z in all_zones:
            if z['grid_row'] == zone['grid_row'] and z['grid_col'] == zone['grid_col']:
                continue
            dist = math.sqrt((z['lat'] - zone['lat'])**2 + (z['lng'] - zone['lng'])**2)
            if dist <= eps:
                neighbors.append(z)
        return neighbors
    
    for zone in high_zones:
        key = (zone['grid_row'], zone['grid_col'])
        if key in visited:
            continue
        
        neighbors = get_neighbors(zone, high_zones)
        if len(neighbors) < 2:  # Min points for cluster
            continue
        
        cluster = [zone]
        visited.add(key)
        
        queue = list(neighbors)
        while queue:
            neighbor = queue.pop(0)
            nkey = (neighbor['grid_row'], neighbor['grid_col'])
            if nkey in visited:
                continue
            visited.add(nkey)
            cluster.append(neighbor)
            nn = get_neighbors(neighbor, high_zones)
            if len(nn) >= 2:
                queue.extend(nn)
        
        if len(cluster) >= 3:
            # Compute cluster statistics
            total_count = sum(z['count'] for z in cluster)
            avg_cis = sum(z['cis'] for z in cluster) / len(cluster)
            center_lat = sum(z['lat'] for z in cluster) / len(cluster)
            center_lng = sum(z['lng'] for z in cluster) / len(cluster)
            
            all_violations = defaultdict(int)
            all_vehicles = defaultdict(int)
            all_hours = defaultdict(int)
            all_junctions = set()
            all_stations = set()
            
            for z in cluster:
                for vt, cnt in z['violations'].items():
                    all_violations[vt] += cnt
                for vt, cnt in z['vehicles'].items():
                    all_vehicles[vt] += cnt
                for h, cnt in z['hours'].items():
                    all_hours[h] += cnt
                for j in z['junction_names']:
                    all_junctions.add(j)
                for s in z['police_stations']:
                    all_stations.add(s)
            
            clusters.append({
                'id': len(clusters),
                'center_lat': round(center_lat, 6),
                'center_lng': round(center_lng, 6),
                'zone_count': len(cluster),
                'total_violations': total_count,
                'avg_cis': round(avg_cis, 2),
                'max_cis': round(max(z['cis'] for z in cluster), 2),
                'dominant_violation': max(all_violations.items(), key=lambda x: x[1])[0],
                'dominant_vehicle': max(all_vehicles.items(), key=lambda x: x[1])[0],
                'peak_hour': max(all_hours.items(), key=lambda x: x[1])[0],
                'violations': dict(all_violations),
                'vehicles': dict(all_vehicles),
                'hours': dict(all_hours),
                'junctions': list(all_junctions)[:10],
                'police_stations': list(all_stations),
                'zones': [{'lat': z['lat'], 'lng': z['lng'], 'count': z['count'], 'cis': z['cis']} for z in cluster],
            })
    
    clusters.sort(key=lambda x: x['avg_cis'], reverse=True)
    for i, c in enumerate(clusters):
        c['id'] = i
        c['rank'] = i + 1
    
    print(f"  Found {len(clusters)} violation clusters")
    
    # ─── Output JSON Files ───────────────────────────────────────
    print("💾 Writing JSON output files...")
    
    # 1. Zone stats (top zones for heatmap + details)
    zone_output = {
        'total_violations': len(rows),
        'total_zones': len(zone_data),
        'zones': zone_data[:500],  # Top 500 zones by CIS
        'all_heatmap_points': [
            [z['lat'], z['lng'], z['cis']] for z in zone_data
        ],
    }
    with open(os.path.join(OUTPUT_DIR, 'zone_stats.json'), 'w') as f:
        json.dump(zone_output, f)
    print(f"  ✅ zone_stats.json ({len(zone_data)} zones)")
    
    # 2. Clusters
    with open(os.path.join(OUTPUT_DIR, 'clusters.json'), 'w') as f:
        json.dump({'clusters': clusters}, f)
    print(f"  ✅ clusters.json ({len(clusters)} clusters)")
    
    # 3. Hourly patterns
    hourly_output = {
        'hourly_city': {
            str(h): {str(d): c for d, c in days.items()} 
            for h, days in sorted(hourly_city.items())
        },
        'daily_trend': [
            {'date': d, 'count': c} 
            for d, c in sorted(daily_counts.items())
        ],
        'monthly_trend': [
            {'month': m, 'count': c}
            for m, c in sorted(monthly_counts.items())
        ],
    }
    with open(os.path.join(OUTPUT_DIR, 'hourly_patterns.json'), 'w') as f:
        json.dump(hourly_output, f)
    print(f"  ✅ hourly_patterns.json")
    
    # 4. Violations summary (city-wide stats for overview)
    # Top police stations by violations
    station_list = []
    for name, ss in station_stats.items():
        station_list.append({
            'name': name,
            'count': ss['count'],
            'approved': ss['approved'],
            'rejected': ss['rejected'],
            'pending': ss['pending'],
            'approval_rate': round(ss['approved'] / ss['count'] * 100, 1) if ss['count'] > 0 else 0,
            'vehicles': dict(ss['vehicles']),
            'violations': dict(ss['violations']),
            'hours': {int(k): v for k, v in ss['hours'].items()},
        })
    station_list.sort(key=lambda x: x['count'], reverse=True)
    
    summary = {
        'total_violations': len(rows),
        'total_zones': len(zone_data),
        'total_clusters': len(clusters),
        'date_range': {
            'start': min(daily_counts.keys()) if daily_counts else '',
            'end': max(daily_counts.keys()) if daily_counts else '',
        },
        'vehicle_distribution': dict(sorted(vehicle_dist.items(), key=lambda x: x[1], reverse=True)),
        'violation_distribution': dict(sorted(violation_dist.items(), key=lambda x: x[1], reverse=True)),
        'top_zones': [{
            'lat': z['lat'],
            'lng': z['lng'],
            'count': z['count'],
            'cis': z['cis'],
            'dominant_violation': z['dominant_violation'],
            'dominant_vehicle': z['dominant_vehicle'],
            'police_stations': z['police_stations'],
            'junction_names': z['junction_names'],
        } for z in zone_data[:20]],
        'police_stations': station_list,
        'avg_violations_per_day': round(len(rows) / max(len(daily_counts), 1), 1),
        'peak_hour_city': max(
            ((h, sum(d.values())) for h, d in hourly_city.items()),
            key=lambda x: x[1]
        )[0] if hourly_city else 0,
    }
    with open(os.path.join(OUTPUT_DIR, 'violations_summary.json'), 'w') as f:
        json.dump(summary, f)
    print(f"  ✅ violations_summary.json")
    
    print("\n🎉 ParkSense AI Data Pipeline Complete!")
    print(f"   Total violations processed: {len(rows):,}")
    print(f"   Zones identified: {len(zone_data):,}")
    print(f"   Hotspot clusters: {len(clusters)}")
    print(f"   Top CIS zone: {zone_data[0]['lat']}, {zone_data[0]['lng']} (CIS: {zone_data[0]['cis']})")


if __name__ == '__main__':
    main()
