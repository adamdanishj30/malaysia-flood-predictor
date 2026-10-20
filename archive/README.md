# Project Archive 📦

This directory stores legacy prototypes, deprecated web iterations, and uncleaned raw historical datasets. These files are preserved for historical reference and auditability, but are **not used** by the active production application.

---

## Directory Structure

```
archive/
├── legacy_web/
│   ├── skywatch.html           # Original skywatch layout prototype (now unified into index.html)
│   ├── dashboard_classic.html  # Classic v1 dashboard (Chart.js based, prior to the glassmorphism redesign)
│   ├── map_view.html           # Standalone experimental Leaflet map view
│   └── app.js                  # Standalone JavaScript client used exclusively by map_view.html
│
└── legacy_data/
    ├── archive.zip             # Original compressed bundle of raw governmental records
    └── malaysia_flood_master.csv # Raw uncleaned multi-year Malaysian flood records
```

---

## File Details

### 1. `legacy_web/`
* **`skywatch.html`**: The UI template tested during the Dribbble-inspired redesign. It has been fully merged into [`index.html`](../../index.html), which is the active deployment target for Cloudflare Pages.
* **`dashboard_classic.html`**: The initial version 1 dashboard featuring side-by-side Chart.js telemetry charts before the adoption of the unified spline wave and multi-modal layout.
* **`map_view.html` & `app.js`**: An early standalone geospatial visualization prototype built to test Leaflet.js heatmaps and coordinate pinning before the map was integrated directly as an interactive modal within `index.html`.

### 2. `legacy_data/`
* **`archive.zip`**: The original compressed data bundle containing raw uncleaned telemetry.
* **`malaysia_flood_master.csv`**: Raw, unstandardized flood incident records from Malaysian authorities (JPS / NADMA). This file contains duplicate entries and missing coordinates, which have since been cleaned, normalized, and exported to [`ml/data/malaysia_floods_cleaned.csv`](../ml/data/malaysia_floods_cleaned.csv) and [`data/historical_flood_heatmap.json`](../data/historical_flood_heatmap.json).

---

> [!NOTE]
> None of the files in this directory are served in production. Cloudflare Pages build rules (`.assetsignore`) exclude this entire directory to ensure fast, lightweight static deployments.
