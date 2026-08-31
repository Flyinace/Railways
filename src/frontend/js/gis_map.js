/**
 * Indian Railways Geospatial GIS Satellite Radar Map (Tab 3).
 * Powered by Leaflet.js with ESRI World Imagery & CartoDB Dark Matter.
 * Visualizes the 440 KM New Delhi - Kanpur Central trunk corridor with real GPS coordinates,
 * station junction beacons, quick-jump navigation, and animated shadow block overlays.
 */

// Global fallback GPS coordinates for the 10 corridor stations
const CORRIDOR_STATION_GPS = {
    "NDLS": { name: "New Delhi", lat: 28.6431, lng: 77.2197, km: 0.0, platforms: 16, speed: 110, div: "Delhi (NR)" },
    "GZB":  { name: "Ghaziabad Junction", lat: 28.6679, lng: 77.4326, km: 25.0, platforms: 6, speed: 130, div: "Delhi (NR)" },
    "DER":  { name: "Dadri (DFC Junction)", lat: 28.5397, lng: 77.5539, km: 37.0, platforms: 4, speed: 130, div: "Prayagraj (NCR)" },
    "KRJ":  { name: "Khurja Junction", lat: 28.2562, lng: 77.8498, km: 83.0, platforms: 5, speed: 130, div: "Prayagraj (NCR)" },
    "ALJN": { name: "Aligarh Junction", lat: 27.8974, lng: 78.0880, km: 131.0, platforms: 7, speed: 160, div: "Prayagraj (NCR)" },
    "TDL":  { name: "Tundla Junction", lat: 27.2081, lng: 78.2392, km: 209.0, platforms: 5, speed: 160, div: "Prayagraj (NCR)" },
    "FZD":  { name: "Firozabad", lat: 27.1513, lng: 78.4005, km: 226.0, platforms: 4, speed: 160, div: "Prayagraj (NCR)" },
    "ETW":  { name: "Etawah Junction", lat: 26.7769, lng: 79.0238, km: 301.0, platforms: 5, speed: 160, div: "Prayagraj (NCR)" },
    "PHD":  { name: "Phaphund", lat: 26.5683, lng: 79.4674, km: 357.0, platforms: 4, speed: 160, div: "Prayagraj (NCR)" },
    "CNB":  { name: "Kanpur Central", lat: 26.4547, lng: 80.3507, km: 440.0, platforms: 10, speed: 110, div: "Prayagraj (NCR)" }
};

// Tile server providers (Zero API key required)
const GIS_TILE_PROVIDERS = {
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: '&copy; <a href="https://www.esri.com/">ESRI</a> World Imagery &bull; Indian Railways RTIS',
        maxZoom: 18
    },
    dark: {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> Dark Matter &bull; OpenStreetMap',
        maxZoom: 19
    }
};

let gisMap = null;
let currentTileLayer = null;
let currentGISMode = "satellite"; // "satellite" | "dark" | "schematic"
let gisStationMarkers = {};
let gisPolylineGroup = null;
let gisBlockOverlayGroup = null;

/**
 * Initializes the Leaflet GIS Satellite Radar Map.
 */
function initGISMap(topology) {
    const mapContainer = document.getElementById("corridor-gis-map");
    if (!mapContainer) return;

    // Build station dataset merging API topology with fallback GPS
    const stations = (topology && topology.stations) ? topology.stations : Object.keys(CORRIDOR_STATION_GPS).map(code => ({
        code,
        ...CORRIDOR_STATION_GPS[code]
    }));

    // If map instance already exists, refresh markers and overlays
    if (gisMap) {
        populateGISStationChips(stations);
        drawCorridorPolyline(stations);
        placeGISStationMarkers(stations);
        refreshGISBlockOverlays();
        return;
    }

    // Leaflet global check
    if (typeof L === "undefined") {
        console.warn("Leaflet.js not loaded. GIS map deferred.");
        return;
    }

    try {
        // Initialize Leaflet map centered at corridor midpoint (near Tundla/Aligarh)
        gisMap = L.map("corridor-gis-map", {
            center: [27.55, 78.8],
            zoom: 8,
            zoomSnap: 0.5,
            scrollWheelZoom: false, // Prevents accidental page scroll zoom
            attributionControl: true
        });

        // Add default Satellite tile layer (ESRI World Imagery)
        currentTileLayer = L.tileLayer(GIS_TILE_PROVIDERS.satellite.url, {
            attribution: GIS_TILE_PROVIDERS.satellite.attribution,
            maxZoom: GIS_TILE_PROVIDERS.satellite.maxZoom
        }).addTo(gisMap);

        // Layer groups for clean management
        gisPolylineGroup = L.featureGroup().addTo(gisMap);
        gisBlockOverlayGroup = L.featureGroup().addTo(gisMap);

        // Populate Quick Jump Navigation Chips
        populateGISStationChips(stations);

        // Draw the NDLS -> CNB High-Density Trunk Mainline
        drawCorridorPolyline(stations);

        // Place Station Beacon Markers with Rich Popups
        placeGISStationMarkers(stations);

        // Overlay active scheduled shadow blocks
        refreshGISBlockOverlays();

        // Fit map bounds to show entire corridor
        fitGISCorridorBounds();

        // Enable scroll zoom on click/focus
        gisMap.on("click", () => {
            gisMap.scrollWheelZoom.enable();
        });

    } catch (err) {
        console.error("Failed to initialize Leaflet GIS map:", err);
    }
}

/**
 * Populates the horizontal quick-jump navigation chip bar.
 */
function populateGISStationChips(stations) {
    const chipsContainer = document.getElementById("gis-station-chips");
    if (!chipsContainer) return;

    let chipsHtml = "";
    stations.forEach(st => {
        chipsHtml += `
            <button class="gis-chip-btn" id="chip-${st.code}" onclick="jumpToGISStation('${st.code}')" title="Jump to ${st.name} (${st.code}) &bull; KM ${st.km}">
                📍 ${st.code}
            </button>
        `;
    });

    chipsContainer.innerHTML = chipsHtml;
}

/**
 * Draws the high-contrast railway polyline connecting all 10 stations across UP.
 */
function drawCorridorPolyline(stations) {
    if (!gisMap || !gisPolylineGroup) return;
    gisPolylineGroup.clearLayers();

    const latLngs = stations.map(st => {
        const gps = CORRIDOR_STATION_GPS[st.code] || st;
        return [gps.lat, gps.lng];
    });

    // Dark shadow polyline for background separation over satellite imagery
    L.polyline(latLngs, {
        color: "#0f172a",
        weight: 8,
        opacity: 0.5,
        lineCap: "round",
        lineJoin: "round"
    }).addTo(gisPolylineGroup);

    // Mainline Electric Cyan Polyline
    const mainlinePolyline = L.polyline(latLngs, {
        color: "#38bdf8",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "1, 0"
    }).addTo(gisPolylineGroup);

    mainlinePolyline.bindTooltip("NDLS &ndash; CNB High-Density Trunk Mainline (440.0 KM)", {
        sticky: true,
        className: "gis-tooltip-dark"
    });
}

/**
 * Places custom circular station beacon nodes with rich UI popups.
 */
function placeGISStationMarkers(stations) {
    if (!gisMap) return;
    gisStationMarkers = {};

    stations.forEach(st => {
        const gps = CORRIDOR_STATION_GPS[st.code] || st;
        const latLng = [gps.lat, gps.lng];

        // Custom HTML Marker Icon
        const iconHtml = `
            <div class="gis-station-beacon" id="beacon-${st.code}">
                <div class="gis-beacon-ring"></div>
                <div class="gis-beacon-core">${st.code}</div>
            </div>
        `;

        const customIcon = L.divIcon({
            html: iconHtml,
            className: "gis-beacon-wrapper",
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -18]
        });

        const marker = L.marker(latLng, { icon: customIcon }).addTo(gisMap);

        // Hover tooltip
        marker.bindTooltip(`<strong>${st.name}</strong> (${st.code}) &bull; KM ${st.km}`, {
            direction: "top",
            className: "gis-tooltip-dark",
            offset: [0, -14]
        });

        // Rich UI-Friendly Glassmorphism Station Popup
        const depots = st.depots ? st.depots.map(d => `<span class="gis-popup-depot-tag">${d}</span>`).join("") : "";

        const popupContent = `
            <div class="gis-station-popup-card">
                <div class="gis-popup-header">
                    <div>
                        <h4 class="gis-popup-title">${st.name} Junction (${st.code})</h4>
                        <span class="gis-popup-subtitle">${st.division || "Northern / NCR Zone"} &bull; Chainage KM ${st.km}</span>
                    </div>
                    <span class="gis-popup-badge-code">${st.code}</span>
                </div>
                
                <div class="gis-popup-metrics-grid">
                    <div class="gis-metric-cell">
                        <span class="gis-metric-label">Max Speed</span>
                        <span class="gis-metric-value">${st.speed_limit_kmph || 130} km/h</span>
                    </div>
                    <div class="gis-metric-cell">
                        <span class="gis-metric-label">Platforms</span>
                        <span class="gis-metric-value">${st.platforms || 5}</span>
                    </div>
                    <div class="gis-metric-cell">
                        <span class="gis-metric-label">Signalling</span>
                        <span class="gis-metric-value">ABS Quad-Aspect</span>
                    </div>
                    <div class="gis-metric-cell">
                        <span class="gis-metric-label">Traction</span>
                        <span class="gis-metric-value">25 kV AC 50Hz</span>
                    </div>
                </div>

                ${depots ? `<div class="gis-popup-depots-row">${depots}</div>` : ""}

                <div class="gis-popup-actions">
                    <button class="btn-gis-inspect-yard" onclick="openYardSchematic('${st.code}')" title="Open Station Yard Interlocking SVG">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                        Inspect Yard Interlocking
                    </button>
                    <button class="btn-gis-disruption" onclick="openSimulatorAtSection('${st.code}')" title="Test Disruption at ${st.code}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 8 4 4-4 4"/></svg>
                        Test Disruption
                    </button>
                </div>
            </div>
        `;

        marker.bindPopup(popupContent, {
            className: "gis-dark-popup",
            maxWidth: 340,
            closeButton: true
        });

        gisStationMarkers[st.code] = marker;
    });
}

/**
 * Highlights active scheduled maintenance blocks on the satellite map with glowing neon strokes
 * and animated radar ping markers.
 */
function refreshGISBlockOverlays() {
    if (!gisMap || !gisBlockOverlayGroup) return;
    gisBlockOverlayGroup.clearLayers();

    const scheduledBlocks = (currentScheduleData && currentScheduleData.scheduled_blocks) ? currentScheduleData.scheduled_blocks : [];

    scheduledBlocks.forEach(b => {
        // Parse section endpoints, e.g., "ALJN - TDL" or "NDLS - GZB"
        const secParts = b.section.split("-").map(s => s.trim());
        if (secParts.length < 2) return;

        const stFromCode = secParts[0];
        const stToCode = secParts[1];

        const gpsFrom = CORRIDOR_STATION_GPS[stFromCode];
        const gpsTo = CORRIDOR_STATION_GPS[stToCode];

        if (!gpsFrom || !gpsTo) return;

        const blockSegmentCoords = [
            [gpsFrom.lat, gpsFrom.lng],
            [gpsTo.lat, gpsTo.lng]
        ];

        // Midpoint for radar ping marker
        const midLat = (gpsFrom.lat + gpsTo.lat) / 2;
        const midLng = (gpsFrom.lng + gpsTo.lng) / 2;

        const isMulti = b.is_multi_department;
        const strokeColor = isMulti ? "#f43f5e" : "#f59e0b"; // Crimson for multi-shadow, Amber for single

        // Outer glow halo polyline
        L.polyline(blockSegmentCoords, {
            color: strokeColor,
            weight: 12,
            opacity: 0.35,
            lineCap: "round"
        }).addTo(gisBlockOverlayGroup);

        // Animated dashed block polyline
        const blockLine = L.polyline(blockSegmentCoords, {
            color: strokeColor,
            weight: 6,
            opacity: 0.95,
            dashArray: "10, 8",
            className: "gis-animated-block-stroke"
        }).addTo(gisBlockOverlayGroup);

        // Animated Radar Ping Marker at Block Epicenter
        const radarHtml = `
            <div class="gis-radar-ping-container" title="Active Shadow Block: ${b.schedule_id}">
                <div class="gis-radar-wave" style="border-color:${strokeColor}"></div>
                <div class="gis-radar-wave delay-1" style="border-color:${strokeColor}"></div>
                <div class="gis-radar-core" style="background:${strokeColor}"></div>
            </div>
        `;

        const radarIcon = L.divIcon({
            html: radarHtml,
            className: "gis-radar-icon-wrap",
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });

        const radarMarker = L.marker([midLat, midLng], { icon: radarIcon }).addTo(gisBlockOverlayGroup);

        // Format departments
        const deptsBadges = b.departments.map(d => {
            let label = "Track";
            let colorCls = "badge-dept-trk";
            if (d.includes("OHE") || d.includes("TRACTION")) { label = "TRD OHE"; colorCls = "badge-dept-ohe"; }
            else if (d.includes("SIGNAL") || d.includes("TELECOM")) { label = "S&T Signals"; colorCls = "badge-dept-sig"; }
            return `<span class="gis-dept-pill ${colorCls}">${label}</span>`;
        }).join(" ");

        // Build rich glassmorphism popup for the active shadow block
        const blockPopupContent = `
            <div class="gis-block-popup-card">
                <div class="gis-block-popup-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="gis-block-pulse-dot" style="background:${strokeColor}"></span>
                        <h4 class="gis-block-title">${b.schedule_id}: ${b.section}</h4>
                    </div>
                    <span class="gis-block-type-badge">${isMulti ? "SHADOW BUNDLED" : "SINGLE BLOCK"}</span>
                </div>

                <div class="gis-block-window-strip">
                    <span>Approved Window: <strong>${b.start_time} &ndash; ${b.end_time} IST</strong> (${b.duration_min} min)</span>
                    <span>Line: <strong>${b.line} Track</strong> &bull; KM ${b.km_range}</span>
                </div>

                <div class="gis-block-depts-wrap">
                    <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px;">Coordinated Departments:</span>
                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                        ${deptsBadges}
                    </div>
                </div>

                <div class="gis-block-safety-box">
                    <div class="gis-safety-item ${b.power_block_required ? 'safe-active' : ''}">
                        <span>⚡ 25kV Traction Power Cut:</span>
                        <strong>${b.power_block_required ? 'MANDATORY ISOLATION' : 'Not Required'}</strong>
                    </div>
                    <div class="gis-safety-item ${b.disconnection_required ? 'safe-active' : ''}">
                        <span>✓ S&amp;T/T-351 Disconnection:</span>
                        <strong>${b.disconnection_required ? 'MEMO GRANTED' : 'Not Required'}</strong>
                    </div>
                </div>

                <div class="gis-block-downtime-saved">
                    <span>Downtime Saved: <strong>+${b.downtime_saved_min} Minutes</strong> vs unbundled closures</span>
                </div>

                <div class="gis-popup-actions" style="margin-top:8px;">
                    <button class="btn-gis-inspect-yard" onclick="openYardSchematic('${stFromCode}')" style="font-size:0.72rem; padding:5px 10px;">
                        🔍 ${stFromCode} Yard
                    </button>
                    <button class="btn-gis-inspect-yard" onclick="openYardSchematic('${stToCode}')" style="font-size:0.72rem; padding:5px 10px;">
                        🔍 ${stToCode} Yard
                    </button>
                </div>
            </div>
        `;

        blockLine.bindPopup(blockPopupContent, {
            className: "gis-dark-popup",
            maxWidth: 360
        });

        radarMarker.bindPopup(blockPopupContent, {
            className: "gis-dark-popup",
            maxWidth: 360
        });
    });
}

/**
 * Jumps and zooms directly into a specific station on the satellite map,
 * highlights the station chip, and opens the rich station detail popup.
 */
function jumpToGISStation(stCode) {
    if (!gisMap) return;

    const gps = CORRIDOR_STATION_GPS[stCode];
    if (!gps) return;

    // Update active state on quick-jump chips
    document.querySelectorAll(".gis-chip-btn").forEach(btn => btn.classList.remove("active"));
    const activeChip = document.getElementById(`chip-${stCode}`);
    if (activeChip) activeChip.classList.add("active");

    // Smooth flyTo animation
    gisMap.flyTo([gps.lat, gps.lng], 13.5, {
        duration: 1.2,
        easeLinearity: 0.25
    });

    // Open station marker popup after flyTo completes
    setTimeout(() => {
        const marker = gisStationMarkers[stCode];
        if (marker) marker.openPopup();
    }, 1300);
}

/**
 * Resets map view to fit all 10 stations across the 440 KM corridor.
 */
function fitGISCorridorBounds() {
    if (!gisMap) return;

    document.querySelectorAll(".gis-chip-btn").forEach(btn => btn.classList.remove("active"));
    const fitBtn = document.querySelector(".gis-quick-jump-bar .gis-chip-btn");
    if (fitBtn) fitBtn.classList.add("active");

    const allCoords = Object.values(CORRIDOR_STATION_GPS).map(g => [g.lat, g.lng]);
    const bounds = L.latLngBounds(allCoords);
    gisMap.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 10
    });
}

/**
 * Switches between Satellite Imagery, Dark GIS, and the CTC Schematic Board.
 */
function switchMapView(mode) {
    currentGISMode = mode;

    const gisWrapper = document.getElementById("gis-map-wrapper");
    const schematicContainer = document.getElementById("schematic-board-container");

    // Update button active classes
    const btnSat = document.getElementById("btn-view-sat");
    const btnDark = document.getElementById("btn-view-dark");
    const btnSchematic = document.getElementById("btn-view-schematic");

    if (btnSat) btnSat.classList.toggle("active", mode === "satellite");
    if (btnDark) btnDark.classList.toggle("active", mode === "dark");
    if (btnSchematic) btnSchematic.classList.toggle("active", mode === "schematic");

    if (mode === "schematic") {
        if (gisWrapper) gisWrapper.style.display = "none";
        if (schematicContainer) {
            schematicContainer.style.display = "block";
            if (typeof renderNetworkTrackDiagram === "function" && currentTopologyData) {
                renderNetworkTrackDiagram(currentTopologyData);
            }
        }
    } else {
        if (schematicContainer) schematicContainer.style.display = "none";
        if (gisWrapper) gisWrapper.style.display = "block";

        // Swap Leaflet tile layer
        if (gisMap && GIS_TILE_PROVIDERS[mode]) {
            if (currentTileLayer) {
                gisMap.removeLayer(currentTileLayer);
            }
            currentTileLayer = L.tileLayer(GIS_TILE_PROVIDERS[mode].url, {
                attribution: GIS_TILE_PROVIDERS[mode].attribution,
                maxZoom: GIS_TILE_PROVIDERS[mode].maxZoom
            }).addTo(gisMap);

            // Re-order layers: tiles at bottom, polylines on top
            if (gisPolylineGroup) gisPolylineGroup.bringToFront();
            if (gisBlockOverlayGroup) gisBlockOverlayGroup.bringToFront();
        }

        // Reflow Leaflet sizing
        setTimeout(() => {
            if (gisMap) gisMap.invalidateSize();
        }, 80);
    }
}

/**
 * Invalidates Leaflet size when Tab 3 is shown.
 */
function invalidateGISMap() {
    if (gisMap && currentGISMode !== "schematic") {
        gisMap.invalidateSize();
    }
}
