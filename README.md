# 🚨 ParkSense AI — AI-Driven Parking Intelligence Command Center

> **Flipkart Gridlock Hackathon Submission**  
> **Theme:** Poor Visibility on Parking-Induced Congestion (Bengaluru)  
> **Live Demo:** `https://your-netlify-link.netlify.app` <!-- Replace with your actual live Netlify link -->

![Platform Status](https://img.shields.io/badge/Status-Complete-emerald?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Vite%20%7C%20Vanilla%20JS%20%7C%20CSS-blue?style=for-the-badge)
![Maps](https://img.shields.io/badge/Maps-Leaflet.js-orange?style=for-the-badge)
![Charts](https://img.shields.io/badge/Charts-Chart.js-rose?style=for-the-badge)

ParkSense AI is an interactive predictive command center designed for city traffic authorities to combat illegal parking-induced gridlocks. By cleaning and parsing raw historical parking violation logs (over 298,000 records for Bengaluru), ParkSense AI calculates a composite **Congestion Impact Score (CIS)** per micro-zone, allowing authorities to deploy enforcement resources surgically rather than patrolling blindly.

---

## 💡 The Core Innovation: Congestion Impact Score (CIS)

Standard traffic heatmaps simply count violations. ParkSense AI models the *congestion footprint* of each infraction. Every micro-zone (200m grid cell) is scored dynamically:

$$\text{CIS} = 0.25 \times \text{Density} + 0.20 \times \text{JunctionProximity} + 0.15 \times \text{VehicleSize} + 0.15 \times \text{PeakHour} + 0.10 \times \text{Persistence} + 0.15 \times \text{Severity}$$

### Weight Distribution Rationale:
*   **Junction Proximity (20%):** Violations within 100 meters of a major crossroad are weighted 3x higher. Intersection blockages cause cascading gridlocks.
*   **Vehicle Size Factor (15%):** Heavy vehicles (Buses, Tankers, Trucks) cause larger lane blockages than Cars or Scooters and carry severe penalization.
*   **Peak Hours (15%):** Commute windows (8-10 AM, 5-8 PM) are multiplied to model the peak congestion impact.
*   **Persistence Rate (10%):** Chronic hotspots with repeated daily infractions are flagged as persistent bottlenecks.
*   **Violation Severity (15%):** Penalizes high-impact infractions (e.g. *Parking on Footpath*, *Wrong Parking*, *No Parking*) over low-severity incidents.

---

## 🖥️ Platform Features & Capabilities

### 1. 🌐 Command Center (Home)
*   **Dynamic Heatmap:** Real-time spatial visualization of the Congestion Impact Score across Bengaluru.
*   **Temporal Scrubber (Time Slider):** Scrub through hours of the day (0-23) to see hotspots migrate from morning transit hubs to evening shopping corridors.
*   **Critical Zone Ranks:** Interactive sidebar showing top gridlock areas with zoom-to-view capabilities.

### 2. 🔬 Hotspot Analytics
*   **DBSCAN Clustering:** Unsupervised density-based spatial clustering groups raw violations into continuous police enforcement sectors.
*   **Distribution Insights:** Graphical breakdowns (using Chart.js) of violation categories, vehicle distributions, hourly peaks, and long-term timelines.

### 3. 🎯 Enforcement Intelligence
*   **Patrol Dispatch Optimizer:** Ranks zones by **Enforcement ROI** (total congestion reduction per officer dispatched).
*   **Optimal Shift Planner:** Recommends 2-to-4 hour enforcement windows per zone to prevent gridlock *before* it starts.

### 4. 🔮 Predictive Insights
*   **What-If Simulation:** Toggle active patrols in critical zones to instantly recalculate and visualize estimated city-wide congestion reduction in real-time.
*   **8-Hour Forecaster:** Bar chart predicting expected violation spikes based on temporal trends.
*   **Hour × Day Matrix:** Comprehensive heatmap grid detailing counts across every hour of the week.

### 5. 📊 Reports & Station Performance
*   **Station Explorer:** Drill down into specific police station regions (e.g. Shivajinagar, K G Halli).
*   **Validation Dashboard:** Monitor approved, rejected, and pending review ratios.
*   **Data Exports:** Instantly download structured `.csv` profile sheets for reporting.

---

## 🏗️ Technical Architecture & Data Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PARKSENSE AI PLATFORM                         │
├─────────────────────────┬────────────────────┬─────────────────────────┤
│       DATA LAYER        │     AI ENGINE      │   PRESENTATION LAYER    │
│                         │                    │                         │
│  CSV Violation Logs     │  DBSCAN Spatial    │  Vite + Vanilla JS      │
│  (298K raw rows)        │  Clustering        │  CSS Custom Variables   │
│         │               │         │          │  Leaflet.js + Heatmaps  │
│         ▼               │         ▼          │  Chart.js (SVG/Canvas)  │
│  Python preprocess.py   │  CIS Calculator   │                         │
│  ➔ Optimized JSONs      │  What-If Engine    │  Deployed on Netlify    │
└─────────────────────────┴────────────────────┴─────────────────────────┘
```

---

## ⚙️ Getting Started & Running Locally

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18.0 or higher)
*   *(Optional)* Python 3.x (only if you wish to rerun the raw data pipeline)

### Installation
1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/YOUR_USERNAME/gridlock-prototype.git
   cd gridlock-prototype
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

### Running the App
1. Start the Vite local development server:
   ```bash
   npm run dev
   ```
2. Open your browser and navigate to the address shown (typically `http://localhost:5173`).

### Running the Data Preprocessing Pipeline (Optional)
If you wish to recalculate the scores from the raw CSV data:
1. Ensure the raw police violation CSV file (`jan to may police violation_anonymized791b166 (1).csv`) is placed in the project root directory.
2. Navigate to the `data` folder and run the pipeline:
   ```bash
   cd data
   python preprocess.py
   ```
3. The script will rebuild `zone_stats.json`, `clusters.json`, `hourly_patterns.json`, and `violations_summary.json` inside the `data` folder.

---

## 📂 Project Structure

```
.
├── index.html                    # Entry HTML document
├── package.json                  # Vite configuration & npm dependencies
├── vite.config.js               # Build configurations
├── data/
│   ├── preprocess.py            # Python preprocessing script
│   ├── violations_summary.json  # General city statistics
│   ├── clusters.json            # DBSCAN-like spatial clusters
│   ├── hourly_patterns.json     # Time-of-day timelines
│   └── zone_stats.json          # Scored micro-zones data
├── src/
│   ├── main.js                  # SPA router, datetime updater, responsive panel
│   ├── pages/
│   │   ├── command-center.js    # Map heatmaps & temporal scrubbing
│   │   ├── hotspot-analytics.js # Cluster details & charts
│   │   ├── enforcement.js       # Priority dispatch queue & shift plans
│   │   ├── predictions.js       # What-if simulator & forecast
│   │   └── reports.js           # Police station profiles & CSV exporter
│   ├── utils/
│   │   ├── cis-engine.js        # Mathematical composite score algorithms
│   │   └── data-loader.js       # JSON asset fetching and formatting helper
│   └── styles/
│       └── index.css            # Dark command center layout design tokens
└── submission_package/          # Flipkart Gridlock submission assets
```
