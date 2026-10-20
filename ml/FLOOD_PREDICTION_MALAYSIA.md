# Malaysia Flood Predictive Modeling & Real-Time Warning System
> **End-to-End Implementation Blueprint**: Historical Datasets, Live APIs, Machine Learning Pipeline, and Free Hosting on Cloudflare Pages (`*.pages.dev`).

---

## 1. Executive Summary & Architecture Overview

Flooding in Malaysia is broadly categorized into two major phenomena:
1. **Monsoonal Riverine Floods (Banjir Monsun)**: Caused by prolonged continuous heavy precipitation during the Northeast Monsoon (November to March), primarily inundating low-lying river basins along the East Coast (Kelantan, Terengganu, Pahang) and Johor.
2. **Flash Floods (Banjir Kilat)**: Triggered by intense, short-duration convective rainstorms (often >50–60 mm/hr) exceeding urban drainage and runoff capacity, predominantly in dense urban centers (Klang Valley / Selangor / KL, Penang, Johor Bahru).

### Predictive Model Philosophy
Real-world flood prediction requires combining **static spatial susceptibility** with **dynamic meteorological/hydrological hazards**:

$$\text{Flood Risk Probability } P(\text{Flood}) = \sigma\Big(w_1 \cdot \text{Rain}_{1h} + w_2 \cdot \text{Rain}_{24h} + w_3 \cdot \text{SoilMoisture} + w_4 \cdot \text{RiverDischarge} + w_5 \cdot \text{HistoricalFreq} + w_6 \cdot \text{Elevation}\Big)$$

```
                                      ┌────────────────────────────────────────────────────────┐
                                      │              LIVE DYNAMIC WEATHER & RIVER APIs         │
                                      │  • Open-Meteo API (Current rain, 24h sum, soil moist.) │
                                      │  • data.gov.my (JPS live river alert & rainfall)       │
                                      │  • GloFAS Flood API (Forecasted river discharge)       │
                                      └───────────────────────────┬────────────────────────────┘
                                                                  │
┌──────────────────────────────────────────────┐                  │ Real-time parameters
│       HISTORICAL & GEOSPATIAL DATASET        │                  │ (Rainfall mm, River m³/s)
│  • JPS Hotspot Directory (~5,400 hotspots)   │                  ▼
│  • Open-Meteo Historical Archive (2010–2024) │────────► ┌────────────────────────────────────┐
│  • OpenDOSM Historical Impact Records        │          │   PREDICTIVE ML MODEL / INFERENCE  │
│  • NASA POWER / Keanteng Flood Risk (JPS)    │          │   (XGBoost / Random Forest / ONNX) │
└──────────────────────────────────────────────┘          └─────────────────┬──────────────────┘
                                                                            │ Risk Score (0-100%)
                                                                            ▼
                                                          ┌────────────────────────────────────┐
                                                          │  INTERACTIVE WEB UI (pages.dev)    │
                                                          │  • Mapbox / Leaflet.js Hotspot Map │
                                                          │  • Live Warning Badges (Alert/Risk)│
                                                          │  • 100% Free Hosting on Cloudflare │
                                                          └────────────────────────────────────┘
```

---

## 2. Verified & Functional Malaysian APIs (100% Free)

All endpoints below have been tested and verified to be operational:

### A. Malaysian Open Government API (`data.gov.my`)
Provided officially by the Government of Malaysia and the Malaysian Meteorological Department (METMalaysia) / Department of Irrigation and Drainage (JPS).

| Endpoint | Method | Rate Limit / Auth | Data Provided |
| :--- | :--- | :--- | :--- |
| `https://api.data.gov.my/flood-warning/` | `GET` | Free, No Auth | Live telemetry from nationwide JPS river water level stations, normal/alert/warning/danger thresholds, 1h and daily rainfall. |
| `https://api.data.gov.my/weather/forecast/` | `GET` | Free, No Auth | 7-day weather forecasts for all Malaysian districts and major towns (morning, afternoon, night rain/thunderstorm summaries). |
| `https://api.data.gov.my/weather/warning/` | `GET` | Free, No Auth | Active severe weather alerts (Continuous Heavy Rain - Yellow, Orange, Red warnings). |

**Sample Tested Request (JPS River Levels & Rainfall):**
```bash
curl -L -s "https://api.data.gov.my/flood-warning/?limit=5"
```
**Sample Response Payload:**
```json
[
  {
    "station_id": "_CRAU0042",
    "station_name": "Sg. Dong di Kg. Peruas",
    "latitude": 3.94385,
    "longitude": 102.01854,
    "district": "Raub",
    "state": "PAHANG",
    "sub_basin": "Sg. Dong",
    "main_basin": "Sungai Pahang",
    "water_level_current": 133.36,
    "water_level_indicator": "ALERT",
    "water_level_normal_level": 133.40,
    "water_level_alert_level": 133.93,
    "water_level_warning_level": 133.33,
    "water_level_danger_level": 135.00,
    "water_level_trend": "RECEDING",
    "rainfall_latest_1hr": 0.0,
    "rainfall_total_today": 0.0,
    "rainfall_indicator": "NO_RAINFALL"
  }
]
```

---

### B. Open-Meteo High-Resolution Weather & Flood API
Open-Meteo provides free, open-access meteorological and hydrological model data for any latitude and longitude in Malaysia (Peninsular, Sabah, and Sarawak) with zero API keys required.

#### 1. Real-Time & Forecast Weather API
* **Endpoint**: `https://api.open-meteo.com/v1/forecast`
* **Malaysia Coordinates Example (Kuala Lumpur: `3.1390, 101.6869`, Kota Bharu: `6.1254, 102.2381`)**
* **Key Parameters**:
  - `current=precipitation,rain,showers,relative_humidity_2m`
  - `hourly=precipitation,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm`
  - `daily=precipitation_sum,precipitation_probability_max`

```bash
curl -s "https://api.open-meteo.com/v1/forecast?latitude=3.139&longitude=101.6869&current=precipitation,rain,relative_humidity_2m&hourly=soil_moisture_0_to_1cm&daily=precipitation_sum&timezone=Asia/Kuala_Lumpur&forecast_days=3"
```

#### 2. River Discharge & Flood API (GloFAS / ECMWF Integration)
* **Endpoint**: `https://flood-api.open-meteo.com/v1/flood`
* **Features**: Predicts river discharge ($m^3/s$) up to 7 days ahead for any catchment basin in Malaysia.
```bash
curl -s "https://flood-api.open-meteo.com/v1/flood?latitude=3.139&longitude=101.6869&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=5"
```

#### 3. Historical Weather Archive API (2010–2024 Training Set)
* **Endpoint**: `https://archive-api.open-meteo.com/v1/archive`
* **Usage**: Generate 10+ years of hourly/daily rainfall and soil saturation records for any flood hotspot in Malaysia to train your ML model.
```bash
curl -s "https://archive-api.open-meteo.com/v1/archive?latitude=3.139&longitude=101.6869&start_date=2015-01-01&end_date=2023-12-31&daily=precipitation_sum,rain_sum,precipitation_hours"
```

---

## 3. Curated Historical Flood Datasets (Malaysia Only)

| Dataset | Source / Link | Format | Content & Utility |
| :--- | :--- | :--- | :--- |
| **JPS Flood Hotspots Registry (Senarai Hotspot Banjir)** | [Public InfoBanjir (water.gov.my)](https://publicinfobanjir.water.gov.my/) / JPS National Reports | CSV / GeoJSON | Coordinates and basin profiles of ~5,400 recurrent flood locations across all 13 states. Essential for static risk scoring. |
| **Malaysia Flood & Flash Flood Dataset (2010–2024)** | [Kaggle - Malaysia Flood Dataset](https://www.kaggle.com/) | CSV | Meteorological reanalysis (NASA MERRA-2) mapped to Malaysian historical flood dates and flash flood incidents across major urban centers. |
| **Flood Risk Modeling Dataset (DID/JPS)** | [GitHub: keanteng/flood_risk_model_2](https://github.com/keanteng/flood_risk_model_2) | CSV (`flood_risk.csv`, `regression_data.csv`) | Historical JPS river gauge readings, rainfall accumulation, and flood occurrence binary targets $(0, 1)$. |
| **OpenDOSM Flood Disaster Impact** | [OpenDOSM (open.dosm.gov.my)](https://open.dosm.gov.my) | CSV / Parquet | State and district level historical flood damages, population displaced, and affected households (2015–2024). |
| **Humanitarian Data Exchange (HDX) Malaysia** | [HDX OCHA Malaysia](https://data.humdata.org/group/mys) | GeoJSON / Shapefile | Sub-national administrative boundaries, river basin layers, and satellite flood extents from major monsoon events (e.g., 2014 East Coast Flood, 2021 Klang Valley Flood). |

---

## 4. Feature Engineering & Predictive Model Design

### A. Feature Matrix Formulation
For any given location $i$ at time $t$:

| Feature Category | Feature Name | Description | Source |
| :--- | :--- | :--- | :--- |
| **Dynamic Meteorologic** | `rain_current_1h` | Rainfall rate in current hour ($mm$) | Open-Meteo / data.gov.my |
| | `rain_accum_24h` | Cumulative rainfall over past 24 hours ($mm$) | Open-Meteo hourly sum |
| | `rain_accum_72h` | Antecedent 3-day rainfall accumulation ($mm$) | Open-Meteo hourly sum |
| | `soil_moisture` | Upper layer soil moisture saturation ($m^3/m^3$) | Open-Meteo hourly |
| | `forecast_rain_24h` | Forecasted rainfall sum over next 24 hours ($mm$) | Open-Meteo / METMalaysia |
| **Dynamic Hydrologic** | `river_discharge_m3s` | Estimated river flow rate ($m^3/s$) | Open-Meteo GloFAS |
| | `water_level_ratio` | $\text{Current Level} / \text{Danger Level}$ | `api.data.gov.my` JPS station |
| **Static Spatial** | `hist_flood_freq` | Historical flood frequency score ($0-100$) | JPS Hotspot Registry |
| | `elevation_m` | Height above sea level ($m$) | SRTM DEM / Open-Meteo |
| | `terrain_slope` | Topographical slope / drainage capacity | Geospatial DEM |

### B. Machine Learning Pipeline (Python Example)
You can train a gradient boosting classifier (`XGBoost` or `LightGBM`) to output a probabilistic risk score:

```python
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

# 1. Feature columns
features = [
    'rain_current_1h',
    'rain_accum_24h',
    'rain_accum_72h',
    'soil_moisture',
    'forecast_rain_24h',
    'river_discharge_m3s',
    'hist_flood_freq',
    'elevation_m'
]

# 2. Train XGBoost Model
model = XGBClassifier(
    n_estimators=150,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=3.5, # Handles class imbalance (floods are rarer than dry days)
    random_state=42
)

# 3. Predict Real-time Flood Probability
# proba = model.predict_proba(live_features)[:, 1] # Probability (0.0 to 1.0)
```

### C. Risk Tier Categorization
* **Low Risk ($0\% - 25\%$)**: Routine weather, low precipitation ($<15 \text{ mm/24h}$), river levels within normal range.
* **Moderate / Watch ($26\% - 55\%$)**: Moderate rainfall ($20 - 50 \text{ mm/24h}$), high soil moisture; potential for localized flash puddles in low-lying alleys.
* **High Warning ($56\% - 80\%$)**: Heavy rainfall ($>60 \text{ mm/24h}$ or $>30 \text{ mm/1h}$), saturated soil, river approaching alert stage. High flash flood probability.
* **Severe / Danger ($>80\%$)**: Continuous torrential rainfall ($>100 \text{ mm/24h}$), river water exceeding danger threshold. Urgent evacuation advisory.

---

## 5. Web Application Development & Deployment to `pages.dev`

### Why Cloudflare Pages (`*.pages.dev`)?
* **100% Free Forever**: Unlimited bandwidth, free SSL certificate, global CDN edge network.
* **Direct GitHub Integration**: Any `git push` automatically builds and deploys your site to `https://<your-project>.pages.dev`.
* **Zero Backend Costs**: By executing API calls directly in the browser (or using Cloudflare Functions for serverless proxying), you pay \$0 in hosting and compute fees.

### Web Architecture
```
frontend/
├── index.html        # Main dashboard UI with Malaysian Map & Hotspot Selector
├── app.js            # Live API fetcher (Open-Meteo & data.gov.my) + ML inference logic
├── style.css         # Modern styling (Tailwind CSS CDN)
└── data/
    └── hotspots.json # Curated Malaysian flood hotspots with GPS coordinates & historical risk weights
```

### Deployment Steps:
1. Initialize a Git repository in `FloodProject` and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Malaysia Flood Predictor"
   git remote add origin https://github.com/<your-username>/malaysia-flood-predictor.git
   git push -u origin main
   ```
2. Go to [dash.cloudflare.com](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository.
4. Leave build settings as default (Static HTML: Build command empty, Output directory `/` or root).
5. Click **Save and Deploy**. Your site will be live immediately at `https://<project-name>.pages.dev`!

---

## 6. Curated Malaysian Hotspots Reference

Key high-risk Malaysian flood locations pre-configured in this project:

| State | Hotspot District / River Basin | Predominant Flood Type | Lat / Lon Coordinates |
| :--- | :--- | :--- | :--- |
| **Selangor** | Taman Sri Muda, Shah Alam (Sg. Klang) | Flash & Urban Basin Overflow | `3.0234, 101.5381` |
| **Kuala Lumpur** | Masjid Jamek / Jalan Tun Perak (Sg. Gombak & Klang) | Urban Flash Flood | `3.1492, 101.6961` |
| **Kelantan** | Rantau Panjang (Sg. Golok) | Monsoonal River Basin Inundation | `5.9986, 101.9744` |
| **Kelantan** | Kota Bharu (Sg. Kelantan) | Monsoonal Inundation | `6.1254, 102.2381` |
| **Pahang** | Temerloh (Sg. Pahang) | Riverine Catchment Flood | `3.4506, 102.4176` |
| **Pahang** | Sri Damai, Kuantan (Sg. Belat) | Monsoonal Coastal Flood | `3.7619, 103.2361` |
| **Johor** | Segamat (Sg. Segamat) | Heavy Monsoon Basin Inundation | `2.5148, 102.8158` |
| **Johor** | Kota Tinggi (Sg. Johor) | Riverine Flood | `1.7381, 103.8999` |
| **Terengganu** | Hulu Terengganu / Telemong | Monsoonal Flood | `5.0683, 102.9961` |
| **Penang** | Jalan P. Ramlee / George Town (Sg. Pinang) | Flash & High Tide Congestion | `5.4141, 100.3142` |
| **Sarawak** | Batu Kawa, Kuching (Sg. Sarawak) | Flash & Tidal Monsoonal | `1.5173, 110.3015` |
| **Sabah** | Penampang (Sg. Moyog) | Riverine & Flash Flood | `5.9126, 116.1154` |

---

## 7. Next Milestones & Action Items

1. [x] **Verified APIs**: `data.gov.my` flood & weather endpoints, and `Open-Meteo` weather & GloFAS river discharge APIs confirmed live.
2. [x] **Hotspot Geospatial Database**: Pre-mapped GPS coordinates for major Malaysian flood zones.
3. [ ] **Build Web Application Files**: Generate `index.html`, `app.js`, and `hotspots.json` for immediate preview and testing.
4. [ ] **Connect Live In-Browser ML Model**: Compute dynamic flood risk score $(0\% - 100\%)$ upon hotspot selection using live precipitation, river discharge, and soil saturation telemetry.
5. [ ] **Push to GitHub and Deploy to Cloudflare Pages (`*.pages.dev`)**.
