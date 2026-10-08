# Malaysia Flood Predictor 🌧️🌊

An interactive AI-powered flood risk forecasting and monitoring system for **Malaysia**. It fuses **historical flood susceptibility indices** across recurrent Malaysian hotspots with **real-time meteorological and hydrological APIs** (Open-Meteo, GloFAS river discharge, and data.gov.my).

---

## 🚀 Key Features

1. **Malaysia-Specific Geospatial Intelligence**: Pre-configured with major recurrent flood zones across Peninsular Malaysia, Sabah, and Sarawak (e.g., Taman Sri Muda, Shah Alam; Rantau Panjang, Kelantan; Segamat, Johor; Temerloh, Pahang; Penampang, Sabah; Kuching, Sarawak).
2. **Real-Time Dynamic Weather Integration**:
   - Queries live rainfall rates ($mm/h$) and 24-hour precipitation accumulation.
   - Computes upper soil layer moisture saturation ($m^3/m^3$) — saturated ground prevents absorption, triggering flash floods.
   - Monitors upstream river discharge ($m^3/s$) forecasts via ECMWF GloFAS.
3. **Probabilistic Predictive Engine**: Evaluates logistic hazard ratios balancing historical baseline risk against incoming storm triggers.
4. **Zero-Cost Deployment on Cloudflare Pages (`*.pages.dev`)**:
   - 100% static frontend (HTML, Tailwind CSS, Leaflet.js).
   - Direct browser-to-API calls with no paid servers or API keys required.

---

## 📡 Live Functional APIs Used

| API Service | Endpoint | Key Telemetry Data |
| :--- | :--- | :--- |
| **Open-Meteo Weather** | `https://api.open-meteo.com/v1/forecast` | Current rain ($mm$), 24h rain sum, humidity, temperature, soil moisture |
| **Open-Meteo Flood (GloFAS)** | `https://flood-api.open-meteo.com/v1/flood` | Daily river flow discharge ($m^3/s$) & peak projections |
| **data.gov.my Flood Warning** | `https://api.data.gov.my/flood-warning/` | Live JPS river alert / warning / danger levels |
| **data.gov.my Weather Forecast** | `https://api.data.gov.my/weather/forecast/` | METMalaysia 7-day weather outlook by district |

---

## 📂 Project Structure

```
FloodProject/
├── FLOOD_PREDICTION_MALAYSIA.md   # Complete technical architecture & research document
├── README.md                      # Quickstart and deployment guide
├── index.html                     # Responsive disaster monitoring dashboard
├── app.js                         # Live API client and predictive model engine
├── train_flood_model.py           # Machine learning training and evaluation script
└── data/
    └── malaysia_hotspots.json     # Curated database of Malaysian flood hotspots & thresholds
```

---

## 💻 Local Testing & Preview

To preview the dashboard on your computer:

```bash
# In the project root folder:
python -m http.server 8000
```

Open your browser at:
👉 **`http://localhost:8000`**

---

## 🌐 Deploying for Free to Cloudflare Pages (`*.pages.dev`)

Cloudflare Pages provides free hosting with unlimited bandwidth and automatic HTTPS:

1. Create a free account at [Cloudflare](https://dash.cloudflare.com/).
2. Push this project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Malaysia Flood Predictor"
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
3. In the Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4. Select your repository.
5. In the Build settings:
   - **Framework preset**: `None`
   - **Build command**: *(leave blank)*
   - **Build output directory**: `/` (or root)
6. Click **Save and Deploy**. Your website will be live at `https://<your-project>.pages.dev` in seconds!
