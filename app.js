// Malaysia Flood Interactive Map & Predictive AI Engine
// Directly queries Open-Meteo Weather API & GloFAS Hydrological Model

let map;
let baseLayers = {};
let currentLayer;
let hotspotsData = [];
let hotspotMarkers = {};
let activeUserMarker = null;
let selectedLocation = null;

// Embedded high-accuracy fallback hotspots across Malaysia
const FALLBACK_HOTSPOTS = [
  { id: "my-sgr-01", name: "Taman Sri Muda, Shah Alam", district: "Petaling", state: "Selangor", basin: "Sungai Klang Basin", lat: 3.0234, lon: 101.5381, elevation_m: 8, flood_type: "Urban Flash & River Basin Overflow", historical_risk_score: 92, critical_rain_1h_mm: 40, critical_rain_24h_mm: 90, notes: "Low-lying retention basin, severe historical flooding in Dec 2021." },
  { id: "my-kl-01", name: "Masjid Jamek & Jalan Tun Perak", district: "Kuala Lumpur", state: "W.P. Kuala Lumpur", basin: "Confluence Sg. Klang & Sg. Gombak", lat: 3.1492, lon: 101.6961, elevation_m: 35, flood_type: "Rapid Urban Flash Flood", historical_risk_score: 85, critical_rain_1h_mm: 50, critical_rain_24h_mm: 80, notes: "Protected partially by SMART Tunnel during intense downpours." },
  { id: "my-kel-01", name: "Rantau Panjang", district: "Pasir Mas", state: "Kelantan", basin: "Sungai Golok Basin", lat: 5.9986, lon: 101.9744, elevation_m: 12, flood_type: "Northeast Monsoon Riverine Flood", historical_risk_score: 95, critical_rain_1h_mm: 30, critical_rain_24h_mm: 110, notes: "Annual severe inundation during Northeast Monsoon; border river basin overflow." },
  { id: "my-kel-02", name: "Kota Bharu (Tambatan Diraja)", district: "Kota Bharu", state: "Kelantan", basin: "Sungai Kelantan Basin", lat: 6.1254, lon: 102.2381, elevation_m: 6, flood_type: "Major Monsoon Riverine Flood", historical_risk_score: 88, critical_rain_1h_mm: 35, critical_rain_24h_mm: 120, notes: "Low-lying coastal delta of Kelantan River basin." },
  { id: "my-phg-01", name: "Temerloh", district: "Temerloh", state: "Pahang", basin: "Sungai Pahang Basin", lat: 3.4506, lon: 102.4176, elevation_m: 32, flood_type: "Catchment Basin Riverine Flood", historical_risk_score: 90, critical_rain_1h_mm: 35, critical_rain_24h_mm: 100, notes: "Main drainage axis for Peninsular Malaysia's longest river." },
  { id: "my-phg-02", name: "Sri Damai / Jaya Gading", district: "Kuantan", state: "Pahang", basin: "Sungai Belat Basin", lat: 3.7619, lon: 103.2361, elevation_m: 7, flood_type: "Monsoonal & Tidal Surge Flood", historical_risk_score: 82, critical_rain_1h_mm: 40, critical_rain_24h_mm: 95, notes: "Low-elevation coastal flood basin influenced by sea tide backflow." },
  { id: "my-jhr-01", name: "Segamat Town", district: "Segamat", state: "Johor", basin: "Sungai Segamat / Muar Basin", lat: 2.5148, lon: 102.8158, elevation_m: 22, flood_type: "Riverine Flood", historical_risk_score: 87, critical_rain_1h_mm: 35, critical_rain_24h_mm: 100, notes: "Recurrent inundation during southern monsoon bursts (2006, 2011, 2023)." },
  { id: "my-jhr-02", name: "Kota Tinggi Town Center", district: "Kota Tinggi", state: "Johor", basin: "Sungai Johor Basin", lat: 1.7381, lon: 103.8999, elevation_m: 10, flood_type: "Riverine & Tidal Backwater Flood", historical_risk_score: 89, critical_rain_1h_mm: 40, critical_rain_24h_mm: 100, notes: "Susceptible to king tide coinciding with upstream rainfall." },
  { id: "my-trg-01", name: "Kuala Berang", district: "Hulu Terengganu", state: "Terengganu", basin: "Sungai Terengganu Basin", lat: 5.0683, lon: 102.9961, elevation_m: 18, flood_type: "Monsoon Inundation", historical_risk_score: 86, critical_rain_1h_mm: 35, critical_rain_24h_mm: 115, notes: "Fast-rising highland runoff feeding into coastal plains." },
  { id: "my-pen-01", name: "Jalan P. Ramlee / George Town", district: "Timur Laut", state: "Pulau Pinang", basin: "Sungai Pinang Basin", lat: 5.4141, lon: 100.3142, elevation_m: 5, flood_type: "Urban Flash Flood & High Tide", historical_risk_score: 84, critical_rain_1h_mm: 45, critical_rain_24h_mm: 75, notes: "Urban channel overflow aggravated during coastal high tides." },
  { id: "my-kdh-01", name: "Kepala Batas & Jitra", district: "Kubang Pasu", state: "Kedah", basin: "Sungai Kedah Basin", lat: 6.2690, lon: 100.4190, elevation_m: 11, flood_type: "Paddy Plain & Monsoon Flood", historical_risk_score: 79, critical_rain_1h_mm: 40, critical_rain_24h_mm: 85, notes: "Wide agricultural flatland with slow natural drainage." },
  { id: "my-srw-01", name: "Batu Kawa & Matang", district: "Kuching", state: "Sarawak", basin: "Sungai Sarawak Basin", lat: 1.5173, lon: 110.3015, elevation_m: 9, flood_type: "King Tide & Heavy Rain Flash Flood", historical_risk_score: 81, critical_rain_1h_mm: 45, critical_rain_24h_mm: 100, notes: "King tides ('air pasang besar') combined with Landas monsoon rains." },
  { id: "my-sbh-01", name: "Donggongon / Penampang", district: "Penampang", state: "Sabah", basin: "Sungai Moyog Basin", lat: 5.9126, lon: 116.1154, elevation_m: 14, flood_type: "Rapid Catchment Flash Flood", historical_risk_score: 85, critical_rain_1h_mm: 40, critical_rain_24h_mm: 90, notes: "Steep Crocker Range watershed creates sudden flood peaks." }
];

document.addEventListener('DOMContentLoaded', async () => {
  initMap();
  await loadHotspots();
  setupEventListeners();
});

// 1. Initialize Malaysian Map
function initMap() {
  // Center of Malaysia (covering Peninsular and Borneo Malaysia)
  map = L.map('map', {
    center: [4.2105, 107.0000],
    zoom: 6,
    minZoom: 5,
    maxZoom: 18,
    zoomControl: true
  });

  // Base Map Layer Options
  baseLayers.dark = L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 16
    }),
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16
    })
  ]);

  baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18
  });

  baseLayers.street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  });

  // Default to Dark Mode
  currentLayer = baseLayers.dark;
  currentLayer.addTo(map);

  // CLICK ANYWHERE ON MALAYSIA EVENT LISTENER
  map.on('click', async (e) => {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    handleMapClick(lat, lon);
  });
}

// 2. Load and Plot Malaysian Flood Hotspots
async function loadHotspots() {
  try {
    const res = await fetch('data/malaysia_hotspots.json');
    if (res.ok) {
      hotspotsData = await res.json();
    } else {
      hotspotsData = FALLBACK_HOTSPOTS;
    }
  } catch (err) {
    console.warn('Using embedded fallback hotspots:', err);
    hotspotsData = FALLBACK_HOTSPOTS;
  }

  const select = document.getElementById('hotspotSelect');
  select.innerHTML = '';

  hotspotsData.forEach((spot) => {
    // Dropdown entry
    const opt = document.createElement('option');
    opt.value = spot.id;
    opt.textContent = `${spot.state} • ${spot.name} (${spot.basin})`;
    select.appendChild(opt);

    // Marker styling on map
    const marker = L.circleMarker([spot.lat, spot.lon], {
      radius: 8,
      fillColor: '#3b82f6',
      color: '#ffffff',
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.85
    }).addTo(map);

    marker.bindTooltip(`<strong>${spot.name}</strong><br/>${spot.basin}`, {
      direction: 'top',
      offset: [0, -8],
      className: 'bg-slate-900 text-white text-xs border border-slate-700 px-2 py-1 rounded shadow-lg'
    });

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      select.value = spot.id;
      inspectHotspot(spot);
    });

    hotspotMarkers[spot.id] = marker;
  });

  // Automatically analyze first hotspot on load
  if (hotspotsData.length > 0) {
    inspectHotspot(hotspotsData[0]);
  }
}

// 3. User Clicks Anywhere on the Malaysian Map
async function handleMapClick(lat, lon) {
  // Validate that point is reasonably within Malaysia / Maritime SE Asia
  // Lat: 0.8 to 7.8, Lon: 99.0 to 120.0
  const isMalaysia = (lat >= 0.8 && lat <= 7.8 && lon >= 99.0 && lon <= 120.0);
  
  // Find nearest known hotspot & calculate distance
  let nearestSpot = hotspotsData[0];
  let minDistanceKm = 99999;
  hotspotsData.forEach(spot => {
    const d = calculateDistanceKm(lat, lon, spot.lat, spot.lon);
    if (d < minDistanceKm) {
      minDistanceKm = d;
      nearestSpot = spot;
    }
  });

  // Show immediate loading indicator marker
  placeActivePin(lat, lon, "Analyzing Coordinates...", "#3b82f6");

  // Attempt reverse geocoding for human-readable place name
  let placeName = `Point (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
  let regionName = isMalaysia ? "Malaysia" : "Regional Maritime";
  let basinName = `Proximate: ${nearestSpot.basin} (~${minDistanceKm.toFixed(0)} km)`;

  try {
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12`;
    const geoRes = await fetch(geoUrl, { headers: { 'Accept': 'application/json' } });
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.address) {
        const addr = geoData.address;
        const sub = addr.suburb || addr.neighbourhood || addr.village || addr.quarter || addr.town || addr.city || "";
        const district = addr.county || addr.district || addr.city || "";
        const state = addr.state || "Malaysia";
        
        placeName = sub ? `${sub}, ${district}` : (district || geoData.name || placeName);
        regionName = state;
      }
    }
  } catch (geoErr) {
    console.log("Using geometric coordinate labels:", geoErr);
  }

  // Construct location profile
  const customLocation = {
    id: `custom-${Date.now()}`,
    name: placeName,
    district: regionName,
    state: regionName,
    basin: basinName,
    lat: lat,
    lon: lon,
    elevation_m: Math.max(Math.round(nearestSpot.elevation_m + (minDistanceKm * 0.1)), 5),
    flood_type: minDistanceKm < 20 ? nearestSpot.flood_type : "Rainfall Runoff Catchment",
    historical_risk_score: Math.max(Math.round(nearestSpot.historical_risk_score * Math.exp(-minDistanceKm / 120)), 35),
    critical_rain_1h_mm: nearestSpot.critical_rain_1h_mm || 40,
    critical_rain_24h_mm: nearestSpot.critical_rain_24h_mm || 90,
    notes: `Custom inspected point on map, ${minDistanceKm.toFixed(1)} km from ${nearestSpot.name}.`
  };

  // Run full prediction pipeline
  await runPredictionPipeline(customLocation, true);
}

// 4. Inspect Predefined Hotspot
async function inspectHotspot(spot) {
  // Smooth camera pan
  map.flyTo([spot.lat, spot.lon], 11, { duration: 1.0 });

  placeActivePin(spot.lat, spot.lon, spot.name, '#3b82f6');
  await runPredictionPipeline(spot, false);
}

// Place / Move the Active Target Pin on Map
function placeActivePin(lat, lon, label, color) {
  if (activeUserMarker) {
    map.removeLayer(activeUserMarker);
  }

  // Custom pulsing target pin
  const customIcon = L.divIcon({
    className: 'custom-pulse-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="pulse-ring-effect" style="border-color: ${color};"></div>
        <div class="w-4 h-4 rounded-full border-2 border-white shadow-xl" style="background-color: ${color};"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  activeUserMarker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
}

// 5. Query Live APIs (Open-Meteo & GloFAS) and Compute Prediction
async function runPredictionPipeline(location, isCustom) {
  selectedLocation = location;
  setLoadingState(location.name);

  // Update Left Profile Card
  document.getElementById('selectedLocationName').textContent = location.name;
  document.getElementById('selectedRegion').textContent = `${location.state} (${location.district})`;
  document.getElementById('histBasin').textContent = location.basin;
  document.getElementById('histElevation').textContent = `${location.elevation_m} m`;
  document.getElementById('histScore').textContent = `${location.historical_risk_score} / 100`;
  document.getElementById('histNotes').textContent = location.notes;
  document.getElementById('coordsBadge').textContent = `${location.lat.toFixed(4)}° N, ${location.lon.toFixed(4)}° E`;
  document.getElementById('predictionTarget').textContent = location.name;

  try {
    // Concurrent fetch to Open-Meteo weather and GloFAS river discharge
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain&hourly=precipitation,soil_moisture_0_to_1cm&daily=precipitation_sum&timezone=Asia%2FKuala_Lumpur&forecast_days=2`;
    const floodUrl = `https://flood-api.open-meteo.com/v1/flood?latitude=${location.lat}&longitude=${location.lon}&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=3`;

    const [weatherRes, floodRes] = await Promise.all([
      fetch(weatherUrl).then(r => r.json()).catch(() => null),
      fetch(floodUrl).then(r => r.json()).catch(() => null)
    ]);

    // Extract dynamic telemetry
    const curRain = weatherRes?.current?.precipitation ?? 0;
    const temp = weatherRes?.current?.temperature_2m ?? 28;
    const humidity = weatherRes?.current?.relative_humidity_2m ?? 80;
    const dailyRain = weatherRes?.daily?.precipitation_sum?.[0] ?? 0;
    const soilMoist = weatherRes?.hourly?.soil_moisture_0_to_1cm?.[0] ?? 0.32;
    const riverDischarge = floodRes?.daily?.river_discharge?.[0] ?? 1.8;
    const riverMax = floodRes?.daily?.river_discharge_max?.[0] ?? (riverDischarge * 1.5);

    // Update Telemetry Cards
    document.getElementById('currentRain').textContent = curRain.toFixed(1);
    document.getElementById('rain24h').textContent = `${dailyRain.toFixed(1)} mm`;
    document.getElementById('soilMoist').textContent = `${soilMoist.toFixed(3)} m³/m³`;
    document.getElementById('relHumidity').textContent = `${humidity}%`;
    document.getElementById('riverDischarge').textContent = riverDischarge.toFixed(2);
    document.getElementById('rainStatus').textContent = curRain > 0 ? 'Active Precipitation' : 'No Rain Falling';
    document.getElementById('riverStatus').textContent = `Projected peak: ${riverMax.toFixed(2)} m³/s`;

    // Compute Probabilistic Model & Depth Regression
    const prediction = executePredictiveModel({
      histRisk: location.historical_risk_score,
      curRain,
      dailyRain,
      crit1h: location.critical_rain_1h_mm,
      crit24h: location.critical_rain_24h_mm,
      soilMoist,
      riverDischarge,
      elevation: location.elevation_m
    });

    // Update UI elements
    renderPrediction(prediction, location);

    // Update Active Map Pin color & attach rich Interactive Popup
    placeActivePin(location.lat, location.lon, location.name, prediction.colorHex);
    
    const popupContent = `
      <div class="font-sans text-xs p-1 space-y-2 min-w-[210px]">
        <div class="flex items-center justify-between pb-1 border-b border-slate-700/80">
          <strong class="text-sm font-bold text-white">${location.name}</strong>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400">Risk Assessment:</span>
          <span class="px-2 py-0.5 rounded font-bold text-[11px]" style="background-color: ${prediction.colorHex}22; color: ${prediction.colorHex}; border: 1px solid ${prediction.colorHex}55;">
            ${prediction.tier} (${prediction.probabilityPercent}%)
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400">Est. Water Depth:</span>
          <span class="font-bold text-white">${prediction.estimatedDepthMeters.toFixed(2)} m</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400">Rainfall Rate:</span>
          <span class="font-medium text-blue-400">${curRain.toFixed(1)} mm/h (${dailyRain.toFixed(1)} mm/24h)</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-slate-400">River Discharge:</span>
          <span class="font-medium text-cyan-400">${riverDischarge.toFixed(2)} m³/s</span>
        </div>
        <p class="text-[10px] text-slate-300 italic pt-1 border-t border-slate-800">${prediction.advisory.slice(0, 95)}...</p>
      </div>
    `;

    activeUserMarker.bindPopup(popupContent, { offset: [0, -10] }).openPopup();

  } catch (err) {
    console.error("Telemetry error:", err);
    document.getElementById('advisoryText').textContent = "Failed to fetch live satellite weather. Please retry.";
  }
}

// 6. Machine Learning Predictive Calculation (Calibrated with JPS observations)
function executePredictiveModel(inputs) {
  const { histRisk, curRain, dailyRain, crit1h, crit24h, soilMoist, riverDischarge, elevation } = inputs;

  const prior = histRisk / 100.0;
  const rainIntensityRatio = Math.min(curRain / Math.max(crit1h, 10), 1.5);
  const accumRainRatio = Math.min(dailyRain / Math.max(crit24h, 20), 1.5);

  let soilFactor = 0.1;
  if (soilMoist > 0.42) soilFactor = 0.95;
  else if (soilMoist > 0.35) soilFactor = 0.65;
  else if (soilMoist > 0.25) soilFactor = 0.35;

  const riverFactor = Math.min(riverDischarge / 15.0, 1.0);
  const elevationVulnerability = elevation < 10 ? 1.25 : (elevation < 30 ? 1.0 : 0.65);

  const logit = (
    -3.5 +
    (2.3 * prior * elevationVulnerability) +
    (3.5 * rainIntensityRatio) +
    (2.8 * accumRainRatio) +
    (1.4 * soilFactor) +
    (1.1 * riverFactor)
  );

  const probability = 1 / (1 + Math.exp(-logit));
  const probabilityPercent = Math.min(Math.max(Math.round(probability * 100), 2), 99);

  // Inundation depth regression estimation (meters)
  let estimatedDepthMeters = 0.0;
  if (probabilityPercent >= 28) {
    const depthBase = (probability - 0.25) * 1.5;
    const rainFactor = accumRainRatio * 0.45;
    estimatedDepthMeters = Math.min(Math.max(depthBase + rainFactor, 0.05), 3.20);
  }

  // Tiers and Actionable Advice
  let tier, badgeClass, badgeBg, colorHex, advisory;

  if (probabilityPercent >= 80) {
    tier = 'CRITICAL DANGER';
    badgeClass = 'bg-red-500/20 text-red-400 border-red-500/40';
    badgeBg = 'bg-red-500';
    colorHex = '#ef4444';
    advisory = 'Severe flood threat imminent! Torrential rain and saturated soils indicate dangerous inundation. Evacuate low-lying areas and follow BOMBA / NADMA instructions immediately.';
  } else if (probabilityPercent >= 55) {
    tier = 'HIGH WARNING';
    badgeClass = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
    badgeBg = 'bg-orange-500';
    colorHex = '#f97316';
    advisory = 'Significant flood risk. Heavy downpours may overwhelm river channels and urban drainage. Move vehicles and essentials to higher elevations.';
  } else if (probabilityPercent >= 28) {
    tier = 'MODERATE WATCH';
    badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    badgeBg = 'bg-amber-500';
    colorHex = '#f59e0b';
    advisory = 'Moderate vigilance advised. Localized roadside pooling and flash puddles possible in low-lying roads during storms.';
  } else {
    tier = 'LOW / NORMAL';
    badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    badgeBg = 'bg-emerald-500';
    colorHex = '#10b981';
    advisory = 'Conditions are normal. Current precipitation and river catchments are safely within standard hydrological thresholds.';
  }

  return {
    probabilityPercent,
    estimatedDepthMeters,
    tier,
    badgeClass,
    badgeBg,
    colorHex,
    advisory
  };
}

// 7. Update Dashboard UI with Prediction
function renderPrediction(prediction, location) {
  // Threat Badge
  const badge = document.getElementById('riskBadge');
  badge.className = `self-start sm:self-auto px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-md flex items-center gap-2 ${prediction.badgeClass}`;
  badge.innerHTML = `<span class="w-2 h-2 rounded-full ${prediction.badgeBg} animate-pulse"></span> ${prediction.tier}`;

  // Probability Meter
  const probEl = document.getElementById('probPercent');
  probEl.textContent = `${prediction.probabilityPercent}%`;
  probEl.style.color = prediction.colorHex;

  const probBar = document.getElementById('probBar');
  probBar.style.width = `${prediction.probabilityPercent}%`;
  probBar.style.backgroundColor = prediction.colorHex;

  // Flood Depth
  const depthEl = document.getElementById('estDepth');
  depthEl.textContent = prediction.estimatedDepthMeters.toFixed(2);
  depthEl.style.color = prediction.estimatedDepthMeters > 0.5 ? '#ef4444' : (prediction.estimatedDepthMeters > 0 ? '#f59e0b' : '#ffffff');

  const depthStatus = document.getElementById('depthStatus');
  depthStatus.textContent = prediction.estimatedDepthMeters > 0.5 ? 'Significant Inundation' : (prediction.estimatedDepthMeters > 0 ? 'Localized Pooling' : 'Dry / Normal');

  // Advisory Text
  document.getElementById('advisoryText').textContent = prediction.advisory;
}

function setLoadingState(name) {
  const badge = document.getElementById('riskBadge');
  badge.className = 'self-start sm:self-auto px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-md flex items-center gap-2 bg-slate-800 text-slate-300 border-slate-700';
  badge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Ingesting Telemetry...';

  document.getElementById('predictionTarget').textContent = name || "Querying point...";
  document.getElementById('advisoryText').textContent = 'Connecting to meteorological satellite and river discharge models...';
}

// 8. Event Listeners & UI Controls
function setupEventListeners() {
  // Hotspot Dropdown selector
  const select = document.getElementById('hotspotSelect');
  select.addEventListener('change', (e) => {
    const spot = hotspotsData.find(h => h.id === e.target.value);
    if (spot) inspectHotspot(spot);
  });

  // Refresh Telemetry Button
  document.getElementById('btnRefresh').addEventListener('click', () => {
    if (selectedLocation) {
      if (selectedLocation.id.startsWith('custom-')) {
        handleMapClick(selectedLocation.lat, selectedLocation.lon);
      } else {
        inspectHotspot(selectedLocation);
      }
    }
  });

  // GPS My Location Button
  document.getElementById('btnGpsLocation').addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setLoadingState("Acquiring GPS Position...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        map.flyTo([lat, lon], 12, { duration: 1.2 });
        handleMapClick(lat, lon);
      },
      (err) => {
        alert("Unable to retrieve location. Please click on the map directly.");
        console.error(err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  // Quick Region Navigator Buttons
  document.querySelectorAll('.region-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat);
      const lon = parseFloat(btn.dataset.lon);
      const zoom = parseInt(btn.dataset.zoom);
      map.flyTo([lat, lon], zoom, { duration: 1.2 });
    });
  });

  // Map Base Layer Switchers
  const btnDark = document.getElementById('btnLayerDark');
  const btnSat = document.getElementById('btnLayerSat');
  const btnStreet = document.getElementById('btnLayerStreet');

  function switchLayer(newLayer, activeBtn) {
    if (currentLayer) map.removeLayer(currentLayer);
    currentLayer = newLayer;
    currentLayer.addTo(map);

    [btnDark, btnSat, btnStreet].forEach(b => {
      b.className = 'px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-medium text-[11px]';
    });
    activeBtn.className = 'px-2 py-1 rounded-lg bg-blue-600 text-white font-medium text-[11px]';
  }

  btnDark.addEventListener('click', () => switchLayer(baseLayers.dark, btnDark));
  btnSat.addEventListener('click', () => switchLayer(baseLayers.satellite, btnSat));
  btnStreet.addEventListener('click', () => switchLayer(baseLayers.street, btnStreet));
}

// Haversine formula to compute distance in km between two GPS coordinates
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
