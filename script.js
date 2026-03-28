// ===== CLOCK =====
function updateClock() {
    const now = new Date();
    document.getElementById('headerClock').textContent =
        now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' | ' + now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// ===== SIDEBAR TOGGLE =====
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('main-content').classList.toggle('expanded');
}

// ===== PAGE NAVIGATION =====
function showPage(pageId, el) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (el) el.classList.add('active');

    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    const titles = {
        'dashboard': ['Dashboard', 'Overview'],
        'traffic': ['Traffic Monitor', 'Live Feed'],
        'parking': ['Parking Zones', 'Occupancy'],
        'payment': ['Payment Scanner', 'Transactions'],
        'incidents': ['Incident Manager', 'Active Incidents'],
        'heatmap': ['Traffic Heatmap', 'Density Analysis'],
        'reports': ['Reports & Export', 'Analytics']
    };
    document.getElementById('dynamic-title').innerText = titles[pageId][0];
    document.getElementById('breadcrumb-sub').innerText = titles[pageId][1];

    if (pageId === 'heatmap') renderHeatmap();
    if (pageId === 'incidents' && document.getElementById('incidentList').children.length === 0) seedIncidents();
    if (pageId === 'reports') drawSparklines();

    document.getElementById('notifPanel').style.display = 'none';
}

// ===== NOTIFICATIONS =====
function toggleNotifs() {
    const p = document.getElementById('notifPanel');
    p.style.display = p.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', e => {
    if (!e.target.closest('.notif-btn') && !e.target.closest('.notif-panel')) {
        const p = document.getElementById('notifPanel');
        if (p) p.style.display = 'none';
    }
});

// ===== VIDEO PREVIEW =====
function initVideoHandlers() {
    const videoInput = document.getElementById('videoInput');
    const videoPreview = document.getElementById('videoPreview');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const statusSpan = document.getElementById('detectionStatus');
    if (!videoInput) return;
    videoInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            videoPreview.src = URL.createObjectURL(file);
            videoPreview.style.display = 'block';
            videoPlaceholder.style.display = 'none';
            if (statusSpan) { statusSpan.innerText = "Video Ready"; statusSpan.style.color = "#f59e0b"; }
        }
    });
}

function startDetection() {
    const videoPreview = document.getElementById('videoPreview');
    const statusSpan = document.getElementById('detectionStatus');
    const rtspInput = document.getElementById('rtspInput');
    if (videoPreview && (videoPreview.src !== window.location.href || (rtspInput && rtspInput.value))) {
        if (statusSpan) { statusSpan.innerText = "AI Running..."; statusSpan.style.color = "#10b981"; }
        if (videoPreview.style.display !== 'none') videoPreview.play();
        showToast("Detection Engine Initialized — YOLOv8 Active", "success");
    } else {
        showToast("Please provide a video file or RTSP stream.", "warn");
    }
}

// ===== EMERGENCY VEHICLE SIMULATION =====
const emergencyVehicleTypes = [
    { key: 'ambulance', label: 'Ambulance', icon: '🚑', priority: 'HIGHEST' },
    { key: 'firetruck', label: 'Fire Truck', icon: '🚒', priority: 'HIGH' },
    { key: 'police', label: 'Police Van', icon: '🚓', priority: 'MEDIUM' }
];
let emvCounts = { ambulance: 0, firetruck: 0, police: 0 };

function initEmergencySimulation() {
    setInterval(() => {
        const rand = Math.random();
        let changed = null;
        if (rand < 0.15) {
            // Ambulance detected
            emvCounts.ambulance = Math.min(emvCounts.ambulance + 1, 9);
            changed = emergencyVehicleTypes[0];
        } else if (rand < 0.25) {
            // Fire truck detected
            emvCounts.firetruck = Math.min(emvCounts.firetruck + 1, 5);
            changed = emergencyVehicleTypes[1];
        } else if (rand < 0.35) {
            // Police van detected
            emvCounts.police = Math.min(emvCounts.police + 1, 7);
            changed = emergencyVehicleTypes[2];
        } else if (rand < 0.42) {
            // One clears
            const keys = Object.keys(emvCounts).filter(k => emvCounts[k] > 0);
            if (keys.length) emvCounts[keys[Math.floor(Math.random() * keys.length)]] = Math.max(0, emvCounts[keys[0]] - 1);
        }
        updateEmvCounts();
        if (changed) logEmvAlert(changed);
    }, 4000);
}

function updateEmvCounts() {
    ['ambulance', 'firetruck', 'police'].forEach(key => {
        const el = document.getElementById(`emv-${key}`);
        if (el) el.textContent = emvCounts[key];
    });
}

function logEmvAlert(vehicle) {
    const log = document.getElementById('emv-alert-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = `emv-log-entry emv-log-${vehicle.key}`;
    entry.innerHTML = `<span>${vehicle.icon} ${vehicle.label} detected — ${vehicle.priority}</span><small>${new Date().toLocaleTimeString()}</small>`;
    log.prepend(entry);
    if (log.children.length > 5) log.lastChild.remove();
    showToast(`🚨 ${vehicle.label} detected on road! Priority: ${vehicle.priority}`, 'danger');
}

// ===== LIVE LOCATION & GOOGLE MAPS =====
// NOTE: Replace YOUR_GOOGLE_MAPS_API_KEY below with your actual API key in the backend
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

let userLat = null, userLng = null;
let watchId = null;
let isWatching = false;

function requestLiveLocation() {
    if (!navigator.geolocation) {
        showGpsModal('not_supported');
        return;
    }
    // Show our custom permission popup FIRST before calling browser GPS
    showLocationPermissionPopup();
}

function showLocationPermissionPopup() {
    const popup = document.getElementById('locationPermPopup');
    popup.style.display = 'flex';
    setTimeout(() => popup.classList.add('visible'), 10);
}

function closeLocationPermPopup() {
    const popup = document.getElementById('locationPermPopup');
    popup.classList.remove('visible');
    setTimeout(() => { popup.style.display = 'none'; }, 300);
}

function userAllowedLocation() {
    closeLocationPermPopup();
    const btn = document.getElementById('locateBtn');
    const status = document.getElementById('locationStatus');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
    btn.disabled = true;
    if (status) { status.textContent = 'Requesting GPS from device...'; status.style.color = 'var(--warn)'; }
    setTimeout(() => doGetPosition(btn, status), 350);
}

function userDeniedLocation() {
    closeLocationPermPopup();
    showGpsModal('permission_denied');
}



function doGetPosition(btn, status) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) + 'm' : 'N/A';
            onLocationSuccess(userLat, userLng, acc);
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Location';
            btn.disabled = false;
            closeGpsModal();
        },
        (err) => {
            btn.innerHTML = '<i class="fas fa-crosshairs"></i> Detect My Location';
            btn.disabled = false;

            if (err.code === 1) {
                // Browser permission denied
                showGpsModal('permission_denied');
            } else if (err.code === 2) {
                // Position unavailable — device GPS is likely OFF
                showGpsModal('gps_off');
            } else if (err.code === 3) {
                // Timeout — GPS hardware not responding
                showGpsModal('gps_timeout');
                if (status) { status.textContent = '⏱ GPS timed out. Is your device GPS turned on?'; status.style.color = 'var(--danger)'; }
            }
        },
        { timeout: 12000, enableHighAccuracy: true }
    );
}

// ===== GPS MODAL =====
function showGpsModal(reason) {
    const modal = document.getElementById('gpsModal');
    const icon  = document.getElementById('gpsModalIcon');
    const title = document.getElementById('gpsModalTitle');
    const body  = document.getElementById('gpsModalBody');
    const steps = document.getElementById('gpsModalSteps');
    const btn   = document.getElementById('gpsModalBtn');

    const configs = {
        gps_off: {
            icon: 'fa-satellite-dish',
            iconColor: '#f59e0b',
            title: 'Device GPS is Turned Off',
            body: 'Your device location/GPS service appears to be disabled. Please turn it on to detect your live location.',
            steps: [
                { icon: 'fa-mobile-alt', text: '<b>Android:</b> Pull down notification bar → tap <b>Location</b> icon to enable' },
                { icon: 'fa-apple',      text: '<b>iPhone:</b> Settings → Privacy & Security → <b>Location Services</b> → Turn On' },
                { icon: 'fa-laptop',     text: '<b>Windows:</b> Settings → Privacy → Location → Turn on <b>Location access</b>' },
                { icon: 'fa-redo',       text: 'Once GPS is on, click <b>Try Again</b> below' }
            ],
            btnText: 'Try Again',
            btnAction: 'retryGps()'
        },
        permission_denied: {
            icon: 'fa-ban',
            iconColor: '#ef4444',
            title: 'Location Permission Denied',
            body: 'Your browser has blocked location access for this site. You need to manually allow it.',
            steps: [
                { icon: 'fa-chrome',    text: '<b>Chrome:</b> Click the 🔒 lock icon in address bar → Site settings → Location → Allow' },
                { icon: 'fa-firefox',   text: '<b>Firefox:</b> Click the 🔒 lock icon → Connection Secure → More Info → Permissions → Allow Location' },
                { icon: 'fa-safari',    text: '<b>Safari:</b> Safari menu → Settings for This Website → Location → Allow' },
                { icon: 'fa-redo',      text: 'After allowing, refresh this page and try again' }
            ],
            btnText: 'Reload Page',
            btnAction: 'location.reload()'
        },
        gps_timeout: {
            icon: 'fa-clock',
            iconColor: '#f59e0b',
            title: 'GPS Signal Timed Out',
            body: 'Your device GPS did not respond in time. This usually means GPS is off or you are indoors with weak signal.',
            steps: [
                { icon: 'fa-toggle-on',    text: 'Make sure your <b>device GPS / Location Services</b> is turned on' },
                { icon: 'fa-window-maximize', text: 'Move to an area with better GPS signal (near a window or outdoors)' },
                { icon: 'fa-redo',         text: 'Then click <b>Try Again</b> below' }
            ],
            btnText: 'Try Again',
            btnAction: 'retryGps()'
        },
        not_supported: {
            icon: 'fa-exclamation-circle',
            iconColor: '#ef4444',
            title: 'GPS Not Supported',
            body: 'Your browser does not support Geolocation. Please use a modern browser like Chrome, Firefox, Edge or Safari.',
            steps: [
                { icon: 'fa-chrome',  text: 'Use <b>Google Chrome</b> (recommended)' },
                { icon: 'fa-firefox', text: 'Or use <b>Mozilla Firefox</b>' },
                { icon: 'fa-edge',    text: 'Or use <b>Microsoft Edge</b>' }
            ],
            btnText: 'Close',
            btnAction: 'closeGpsModal()'
        }
    };

    const cfg = configs[reason] || configs['gps_off'];
    icon.className  = `fas ${cfg.icon} gps-modal-icon`;
    icon.style.color = cfg.iconColor;
    title.textContent = cfg.title;
    body.textContent  = cfg.body;
    btn.innerHTML     = `<i class="fas fa-redo"></i> ${cfg.btnText}`;
    btn.setAttribute('onclick', cfg.btnAction);

    steps.innerHTML = cfg.steps.map(s =>
        `<div class="gps-step"><i class="fas ${s.icon} gps-step-icon"></i><span>${s.text}</span></div>`
    ).join('');

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

function closeGpsModal() {
    const modal = document.getElementById('gpsModal');
    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

function retryGps() {
    closeGpsModal();
    setTimeout(() => requestLiveLocation(), 350);
}



function toggleLiveWatch() {
    if (!navigator.geolocation) return;
    isWatching = true;
    document.getElementById('watchBtn').style.display = 'none';
    document.getElementById('stopWatchBtn').style.display = 'inline-flex';
    showToast('Live GPS tracking started', 'success');

    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) + 'm' : 'N/A';
            onLocationSuccess(userLat, userLng, acc, true);
        },
        (err) => { showToast('GPS watch error: ' + err.message, 'warn'); },
        { enableHighAccuracy: true, maximumAge: 5000 }
    );
}

function stopLiveWatch() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isWatching = false;
    document.getElementById('watchBtn').style.display = 'inline-flex';
    document.getElementById('stopWatchBtn').style.display = 'none';
    showToast('Live GPS tracking stopped', 'info');
    const badge = document.getElementById('gpsStatusBadge');
    if (badge) { badge.className = 'gps-badge active'; badge.innerHTML = '<i class="fas fa-satellite-dish"></i> GPS Fixed'; }
}

function onLocationSuccess(lat, lng, acc, isUpdate = false) {
    const status = document.getElementById('locationStatus');
    const badge = document.getElementById('gpsStatusBadge');

    // Update info bar
    document.getElementById('latVal').textContent = lat.toFixed(6);
    document.getElementById('lngVal').textContent = lng.toFixed(6);
    document.getElementById('accuracyVal').textContent = acc || '—';
    document.getElementById('locTimeVal').textContent = new Date().toLocaleTimeString();
    document.getElementById('locationInfoBar').style.display = 'flex';

    // GPS badge
    if (badge) {
        badge.className = isWatching ? 'gps-badge watching' : 'gps-badge active';
        badge.innerHTML = isWatching
            ? '<i class="fas fa-satellite-dish fa-spin"></i> GPS Live'
            : '<i class="fas fa-satellite-dish"></i> GPS Fixed';
    }

    if (status) { status.textContent = `✅ Location acquired — Accuracy: ${acc}`; status.style.color = 'var(--success)'; }

    // Show watch button only after first fix
    if (!isUpdate) {
        document.getElementById('watchBtn').style.display = 'inline-flex';
        document.getElementById('locateBtn').innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        showToast('📍 Live location detected!', 'success');
    }

    // Render Google Map
    renderGoogleMap(lat, lng);

    // Simulate traffic data
    simulateTrafficFlow(lat, lng);

    // If destination is already set, re-calculate route
    const dest = document.getElementById('destinationInput').value.trim();
    if (dest) findRoutes();
}

function renderGoogleMap(lat, lng) {
    const frame = document.getElementById('googleMapFrame');
    const idle = document.getElementById('mapIdle');
    const pulse = document.getElementById('liveMarkerPulse');

    // Build embed URL — uses API key; shows traffic layer + user marker
    const src = `https://www.google.com/maps/embed/v1/view?key=${GOOGLE_MAPS_API_KEY}&center=${lat},${lng}&zoom=15&maptype=roadmap`;
    frame.src = src;
    frame.style.display = 'block';
    if (idle) idle.style.display = 'none';
    if (pulse) pulse.style.display = 'flex';
}

function findRoutes() {
    const dest = document.getElementById('destinationInput').value.trim();
    if (!dest) { showToast('Please enter a destination.', 'warn'); return; }
    if (!userLat || !userLng) { showToast('Detect your location first.', 'warn'); return; }

    const routeList = document.getElementById('routeList');
    const routeIdle = document.getElementById('routeListIdle');
    const openSection = document.getElementById('openMapsSection');
    const openBtn = document.getElementById('openGoogleMapsBtn');

    // Update map to directions view
    const frame = document.getElementById('googleMapFrame');
    const encodedDest = encodeURIComponent(dest);
    const origin = `${userLat},${userLng}`;

    // Directions embed (with API key)
    frame.src = `https://www.google.com/maps/embed/v1/directions?key=${GOOGLE_MAPS_API_KEY}&origin=${origin}&destination=${encodedDest}&mode=driving&avoid=tolls`;
    frame.style.display = 'block';
    document.getElementById('mapIdle').style.display = 'none';

    // Set "Open in Google Maps" link with directions
    openBtn.href = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${encodedDest}&travelmode=driving`;
    openSection.style.display = 'block';

    // Simulate route options (real data needs Directions API — replace with actual API call in backend)
    const seed = (userLat * 17 + userLng * 13) % 1;
    const routes = [
        {
            name: 'Fastest Route',
            via: 'Via Ring Road / Expressway',
            time: Math.floor(seed * 15 + 8) + ' min',
            dist: (seed * 8 + 3).toFixed(1) + ' km',
            traffic: 'Low',
            color: '#10b981',
            icon: 'fa-bolt',
            recommended: true
        },
        {
            name: 'Shortest Distance',
            via: 'Via City Centre',
            time: Math.floor(seed * 20 + 12) + ' min',
            dist: (seed * 5 + 2).toFixed(1) + ' km',
            traffic: 'Moderate',
            color: '#f59e0b',
            icon: 'fa-ruler',
            recommended: false
        },
        {
            name: 'Avoid Tolls',
            via: 'Via State Highway',
            time: Math.floor(seed * 25 + 18) + ' min',
            dist: (seed * 12 + 6).toFixed(1) + ' km',
            traffic: 'Low',
            color: '#3b82f6',
            icon: 'fa-road',
            recommended: false
        }
    ];

    routeList.innerHTML = '';
    routes.forEach((r, i) => {
        const card = document.createElement('div');
        card.className = 'route-card' + (r.recommended ? ' recommended' : '');
        card.innerHTML = `
            <div class="route-card-header">
                <span class="route-name"><i class="fas ${r.icon}"></i> ${r.name}</span>
                ${r.recommended ? '<span class="route-best-tag">BEST</span>' : ''}
            </div>
            <div class="route-via">${r.via}</div>
            <div class="route-meta">
                <span style="color:${r.color};"><i class="fas fa-clock"></i> ${r.time}</span>
                <span><i class="fas fa-ruler-horizontal"></i> ${r.dist}</span>
                <span class="route-traffic traffic-${r.traffic.toLowerCase()}">● ${r.traffic}</span>
            </div>
            <button class="btn-route-go" onclick="openRouteInMaps('${origin}', '${encodedDest}')">
                <i class="fas fa-directions"></i> Go
            </button>
        `;
        routeList.appendChild(card);
    });

    routeIdle.style.display = 'none';
    routeList.style.display = 'block';
    showToast('Routes calculated! Opening in map view.', 'success');
}

function openRouteInMaps(origin, dest) {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
    window.open(url, '_blank');
}

function clearRoutes() {
    document.getElementById('destinationInput').value = '';
    document.getElementById('routeList').style.display = 'none';
    document.getElementById('routeListIdle').style.display = 'block';
    document.getElementById('openMapsSection').style.display = 'none';
    document.getElementById('openGoogleMapsBtn').href = '#';
    if (userLat && userLng) renderGoogleMap(userLat, userLng);
    showToast('Routes cleared.', 'info');
}

// ===== SIMULATE TRAFFIC FLOW (LIVE ANIMATED) =====
let trafficSimInterval = null;
let tfChartData = [];
let tfChartCtx = null;

function simulateTrafficFlow(lat, lng) {
    // Show panel
    document.getElementById('trafficFlowIdle').style.display = 'none';
    document.getElementById('trafficFlowData').style.display = 'block';
    const badge = document.getElementById('trafficSimBadge');
    if (badge) badge.style.display = 'inline-flex';

    // Init chart once
    const canvas = document.getElementById('tfLiveChart');
    if (canvas && !tfChartCtx) {
        tfChartCtx = canvas.getContext('2d');
        canvas.width = canvas.parentElement.clientWidth || 280;
    }

    // Seed base values from location
    const seed = Math.abs((parseFloat(lat) * 137.5 + parseFloat(lng) * 83.3)) % 100;
    const baseCarsPct  = 0.45 + (seed % 20) / 100;
    const baseBikesPct = 0.30 + (seed % 15) / 100;

    function tick() {
        // Randomise counts with light drift
        const hour = new Date().getHours();
        const peakMult = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20) ? 1.5 : 1.0;
        const cars   = Math.floor((Math.random() * 18 + 14) * peakMult);
        const bikes  = Math.floor((Math.random() * 14 + 7)  * peakMult);
        const trucks = Math.floor((Math.random() * 7  + 2)  * peakMult);
        const total  = cars + bikes + trucks;
        const speed  = Math.floor(Math.random() * 30 + 28);

        // Count cards with flash animation
        animateCounter('tf-cars',   cars);
        animateCounter('tf-bikes',  bikes);
        animateCounter('tf-trucks', trucks);
        animateCounter('tf-total',  total);

        // Speed
        const speedEl   = document.getElementById('tf-speed');
        const speedFill = document.getElementById('tf-speed-fill');
        if (speedEl)   speedEl.textContent = speed;
        if (speedFill) {
            speedFill.style.width = Math.min((speed / 80) * 100, 100) + '%';
            speedFill.style.background = speed < 35 ? '#ef4444' : speed < 55 ? '#f59e0b' : '#10b981';
        }

        // Congestion label
        const cong = document.getElementById('tf-congestion');
        if (cong) {
            if (speed < 35) { cong.textContent = '● Heavy Congestion — Expect Delays';  cong.style.color = '#ef4444'; }
            else if (speed < 55) { cong.textContent = '● Moderate Traffic — Some Delay'; cong.style.color = '#f59e0b'; }
            else               { cong.textContent = '● Free Flow — Clear Roads Ahead';   cong.style.color = '#10b981'; }
        }

        // Flow bars
        const carPct   = Math.round((cars   / total) * 100);
        const bikePct  = Math.round((bikes  / total) * 100);
        const truckPct = Math.round((trucks / total) * 100);
        setFlowBar('tf-bar-cars',   'tf-pct-cars',   carPct);
        setFlowBar('tf-bar-bikes',  'tf-pct-bikes',  bikePct);
        setFlowBar('tf-bar-trucks', 'tf-pct-trucks', truckPct);

        // Chart data (keep last 10 readings)
        tfChartData.push(total);
        if (tfChartData.length > 10) tfChartData.shift();
        drawTfChart();

        // Last update
        const upd = document.getElementById('tf-last-update');
        if (upd) upd.textContent = 'Updated ' + new Date().toLocaleTimeString();
    }

    tick(); // immediate first tick
    if (trafficSimInterval) clearInterval(trafficSimInterval);
    trafficSimInterval = setInterval(tick, 4000);
}

function animateCounter(id, newVal) {
    const el = document.getElementById(id);
    if (!el) return;
    const oldVal = parseInt(el.textContent) || 0;
    const diff = newVal - oldVal;
    const steps = 10;
    let step = 0;
    const timer = setInterval(() => {
        step++;
        el.textContent = Math.round(oldVal + (diff * step / steps));
        if (step >= steps) { el.textContent = newVal; clearInterval(timer); }
    }, 30);
    // Flash highlight
    el.parentElement.style.boxShadow = '0 0 8px var(--accent)';
    setTimeout(() => { el.parentElement.style.boxShadow = ''; }, 400);
}

function setFlowBar(barId, pctId, pct) {
    const bar = document.getElementById(barId);
    const lbl = document.getElementById(pctId);
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = pct + '%';
}

function drawTfChart() {
    const canvas = document.getElementById('tfLiveChart');
    if (!canvas || !tfChartCtx || tfChartData.length < 2) return;
    const ctx = tfChartCtx;
    const w = canvas.width, h = canvas.height;
    const max = Math.max(...tfChartData, 1);
    const min = Math.min(...tfChartData, 0);
    const pad = 4;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach(f => {
        ctx.beginPath(); ctx.moveTo(0, h * f); ctx.lineTo(w, h * f); ctx.stroke();
    });

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0,212,255,0.3)');
    grad.addColorStop(1, 'rgba(0,212,255,0)');
    ctx.beginPath();
    tfChartData.forEach((v, i) => {
        const x = pad + (i / (tfChartData.length - 1)) * (w - pad * 2);
        const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad + (w - pad * 2), h); ctx.lineTo(pad, h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2;
    tfChartData.forEach((v, i) => {
        const x = pad + (i / (tfChartData.length - 1)) * (w - pad * 2);
        const y = pad + (1 - (v - min) / (max - min || 1)) * (h - pad * 2);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Latest dot
    const lx = pad + ((tfChartData.length - 1) / (tfChartData.length - 1)) * (w - pad * 2);
    const lv = tfChartData[tfChartData.length - 1];
    const ly = pad + (1 - (lv - min) / (max - min || 1)) * (h - pad * 2);
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4ff'; ctx.fill();
}

function refreshTrafficFlow() {
    if (userLat && userLng) {
        tfChartData = [];
        simulateTrafficFlow(userLat, userLng);
        showToast('Traffic data refreshed', 'info');
    } else {
        showToast('Detect your location first.', 'warn');
    }
}

let sigTimerA = 28, sigTimerB = 12, sigPhase = 'A';
function initTrafficSimulation() {
    setInterval(() => {
        const speed = Math.floor(Math.random() * 25) + 35;
        const se = document.getElementById('avgSpeed');
        const sf = document.getElementById('speedFill');
        if (se) se.innerText = speed;
        if (sf) sf.style.width = (speed * 1.5) + "%";

        const cl = document.getElementById('congestionLevel');
        if (cl) {
            if (speed < 40) { cl.textContent = "● Heavy Congestion"; cl.style.color = "#ef4444"; }
            else if (speed < 55) { cl.textContent = "● Moderate Traffic"; cl.style.color = "#f59e0b"; }
            else { cl.textContent = "● Free Flow"; cl.style.color = "#10b981"; }
        }

        // Vehicle counts
        document.getElementById('tc-cars') && (document.getElementById('tc-cars').textContent = Math.floor(Math.random() * 20) + 15);
        document.getElementById('tc-trucks') && (document.getElementById('tc-trucks').textContent = Math.floor(Math.random() * 8) + 3);
        document.getElementById('tc-bikes') && (document.getElementById('tc-bikes').textContent = Math.floor(Math.random() * 15) + 5);
        const t = parseInt(document.getElementById('tc-cars')?.textContent || 0) + parseInt(document.getElementById('tc-trucks')?.textContent || 0) + parseInt(document.getElementById('tc-bikes')?.textContent || 0);
        document.getElementById('tc-total') && (document.getElementById('tc-total').textContent = t);

        if (Math.random() > 0.75) {
            const log = document.getElementById('violationLog');
            if (log) {
                const types = ["⚠ Speeding", "🔴 Wrong Way", "⛔ Illegal Turn", "📍 No-Stop Zone"];
                const cams = ["CAM-01", "CAM-02", "CAM-03", "CAM-04"];
                const entry = document.createElement('div');
                entry.className = "log-entry";
                entry.innerHTML = `<span>${types[Math.floor(Math.random() * types.length)]}</span><small>${cams[Math.floor(Math.random() * 4)]} · ${new Date().toLocaleTimeString()}</small>`;
                log.prepend(entry);
                if (log.children.length > 8) log.lastChild.remove();
            }
        }
    }, 3000);

    // Signal timer countdown
    setInterval(() => {
        if (sigPhase === 'A') {
            sigTimerA--;
            if (sigTimerA <= 0) { sigTimerA = 28; sigTimerB = 28; sigPhase = 'B'; switchSignal('B'); }
        } else {
            sigTimerB--;
            if (sigTimerB <= 0) { sigTimerB = 12; sigTimerA = 28; sigPhase = 'A'; switchSignal('A'); }
        }
        document.getElementById('timerA') && (document.getElementById('timerA').textContent = sigTimerA + 's');
        document.getElementById('timerB') && (document.getElementById('timerB').textContent = sigTimerB + 's');
    }, 1000);

    // KPI updates
    setInterval(() => {
        const kv = document.getElementById('kpi-vehicles');
        if (kv) kv.textContent = (parseInt(kv.textContent.replace(',', '')) + Math.floor(Math.random() * 3)).toLocaleString('en-IN');
    }, 5000);
}

function switchSignal(active) {
    const zones = [document.querySelectorAll('.signal-zone')[0], document.querySelectorAll('.signal-zone')[1]];
    if (!zones[0]) return;
    zones.forEach((z, i) => {
        z.querySelectorAll('.sig').forEach(s => s.classList.remove('active'));
        z.querySelector(active === 'A' ? (i === 0 ? '.green' : '.red') : (i === 0 ? '.red' : '.green'))?.classList.add('active');
    });
}

// ===== PARKING GRID =====
let currentZone = 'A';
const zoneData = {
    A: { total: 24, label: 'Zone A – Ground Floor' },
    B: { total: 20, label: 'Zone B – Level 1' },
    C: { total: 16, label: 'Zone C – Rooftop' }
};

function buildParkingGrid(zone) {
    const pGrid = document.getElementById('parkingGrid');
    if (!pGrid) return;
    pGrid.innerHTML = '';
    const total = zoneData[zone].total;
    let occ = 0;
    for (let i = 1; i <= total; i++) {
        const r = Math.random();
        let type, label;
        if (r < 0.02) { type = 'ev'; label = '⚡'; }
        else if (r < 0.07) { type = 'reserved'; label = '★'; }
        else if (r < 0.5) { type = 'occupied'; label = ''; }
        else { type = 'available'; label = ''; }
        if (type === 'occupied' || type === 'reserved') occ++;
        const slot = document.createElement('div');
        slot.className = `slot ${type}`;
        slot.innerHTML = `<span class="slot-num">${zone}-${String(i).padStart(2, '0')}</span><span class="slot-icon">${label || (type === 'occupied' ? '🚗' : '✓')}</span>`;
        slot.onclick = () => showSlotDetail(`${zone}-${String(i).padStart(2, '0')}`, type);
        pGrid.appendChild(slot);
    }
    const pct = Math.round((occ / total) * 100);
    document.getElementById('occBadge') && (document.getElementById('occBadge').textContent = `${occ}/${total} Occupied`);
    document.getElementById('zoneTitle') && (document.getElementById('zoneTitle').textContent = zoneData[zone].label);
    document.getElementById('parkFill') && (document.getElementById('parkFill').style.width = pct + '%');
    document.getElementById('parkCapLabel') && (document.getElementById('parkCapLabel').textContent = `${pct}% capacity — ${total - occ} slots available`);
    document.getElementById('kpi-slots') && (document.getElementById('kpi-slots').textContent = `${occ}/${total}`);
}

function selectZone(zone, el) {
    document.querySelectorAll('.zone-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    currentZone = zone;
    buildParkingGrid(zone);
}

function showSlotDetail(slotId, type) {
    const panel = document.getElementById('slotDetail');
    if (!panel) return;
    const statMap = { occupied: '#ef4444', available: '#10b981', reserved: '#f59e0b', ev: '#00d4ff' };
    const vehicles = ['MH12AB1234', 'KA03CD5678', 'DL01EF9012', 'TN07GH3456'];
    const isOcc = type === 'occupied';
    panel.innerHTML = `
        <div class="slot-id">${slotId}</div>
        <div class="slot-status" style="color:${statMap[type]}; text-transform:uppercase; font-weight:700;">${type}</div>
        ${isOcc ? `<div class="slot-info"><label>Vehicle</label><span>${vehicles[Math.floor(Math.random() * 4)]}</span></div>
        <div class="slot-info"><label>Entry</label><span>${new Date(Date.now() - Math.random() * 7200000).toLocaleTimeString()}</span></div>
        <div class="slot-info"><label>Duration</label><span>${Math.floor(Math.random() * 3) + 1}h ${Math.floor(Math.random() * 59)}m</span></div>
        <div class="slot-info"><label>Est. Fee</label><span>₹${(Math.random() * 100 + 20).toFixed(0)}</span></div>
        <button class="btn-sm-accent" onclick="showPage('payment', document.querySelectorAll('.nav-link')[3])">Process Payment</button>` : `<p style="color:#718096;margin-top:10px;">Slot is currently ${type}.</p>`}
    `;
    addActivity(slotId, type);
}

function addActivity(slotId, type) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    const entry = document.createElement('div');
    entry.className = 'activity-item';
    entry.innerHTML = `<span>${slotId} — ${type}</span><small>${new Date().toLocaleTimeString()}</small>`;
    feed.prepend(entry);
    if (feed.children.length > 8) feed.lastChild.remove();
}

// ===== PAYMENT SCANNER =====
let payMethod = 'qr';
let feeCalculated = false;

function selectPayMethod(method, el) {
    document.querySelectorAll('.pm-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    payMethod = method;
}

function initiateScan() {
    const sa = document.getElementById('scannerArea');
    sa.classList.add('scanning');
    showToast("Scanner active — processing...", "info");

    setTimeout(() => {
        sa.classList.remove('scanning');
        sa.classList.add('scanned');
        document.getElementById('vehicleNum').value = 'MH 12 AB ' + Math.floor(Math.random() * 9000 + 1000);
        document.getElementById('slotNum').value = currentZone + '-' + String(Math.floor(Math.random() * 24) + 1).padStart(2, '0');
        document.getElementById('entryTime').value = new Date(Date.now() - 5400000).toLocaleTimeString();
        document.getElementById('duration').value = '1h 30m';
        showToast("Vehicle detected! Fill details and calculate fee.", "success");
    }, 2500);
}

function calculateFee() {
    const dur = document.getElementById('duration').value;
    const hours = parseFloat(dur) || 1.5;
    const base = Math.ceil(hours) * 30;
    const gst = +(base * 0.18).toFixed(2);
    const total = +(base + gst).toFixed(2);
    document.getElementById('parkFee').textContent = `₹${base}`;
    document.getElementById('gstFee').textContent = `₹${gst}`;
    document.getElementById('totalFee').textContent = `₹${total}`;
    document.getElementById('confirmPayBtn').style.display = 'block';
    feeCalculated = true;
    showToast("Fee calculated. Confirm to proceed.", "info");
}

function confirmPayment() {
    if (!feeCalculated) { showToast("Calculate fee first.", "warn"); return; }
    const owner = document.getElementById('ownerName').value || 'N/A';
    const vehicle = document.getElementById('vehicleNum').value || 'N/A';
    const slot = document.getElementById('slotNum').value || 'N/A';
    const total = document.getElementById('totalFee').textContent;
    const method = payMethod.toUpperCase();

    document.getElementById('paymentForm').style.display = 'none';
    document.getElementById('paymentSuccess').style.display = 'block';
    document.getElementById('paymentSummary').innerHTML = `Owner: <b>${owner}</b><br>Vehicle: <b>${vehicle}</b><br>Slot: <b>${slot}</b><br>Amount: <b>${total}</b><br>Method: <b>${method}</b>`;

    addTransaction(vehicle, slot, total, method);
    updateRevenue(parseInt(total.replace('₹', '')) || 0);
    freeSlot(slot);
}

function addTransaction(vehicle, slot, amount, method) {
    const list = document.getElementById('txnList');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'txn-item';
    item.innerHTML = `<div><span class="txn-vehicle">${vehicle}</span><span class="txn-slot">${slot}</span></div><div><span class="txn-amount">${amount}</span><span class="txn-method ${method.toLowerCase()}">${method}</span></div><small>${new Date().toLocaleTimeString()}</small>`;
    list.prepend(item);
    if (list.children.length > 8) list.lastChild.remove();
}

function updateRevenue(amt) {
    const el = document.getElementById('kpi-revenue');
    if (!el) return;
    const curr = parseInt(el.textContent.replace('₹', '').replace(',', '')) || 0;
    el.textContent = '₹' + (curr + amt).toLocaleString('en-IN');
}

function freeSlot(slot) {
    const slotEls = document.querySelectorAll('.slot .slot-num');
    slotEls.forEach(el => {
        if (el.textContent === slot) {
            const parent = el.parentElement;
            parent.className = 'slot available';
            parent.querySelector('.slot-icon').textContent = '✓';
        }
    });
}

function resetPayment() {
    document.getElementById('paymentForm').style.display = 'block';
    document.getElementById('paymentSuccess').style.display = 'none';
    document.getElementById('ownerName').value = '';
    document.getElementById('vehicleNum').value = '';
    document.getElementById('slotNum').value = '';
    document.getElementById('entryTime').value = '';
    document.getElementById('duration').value = '';
    document.getElementById('parkFee').textContent = '₹0';
    document.getElementById('gstFee').textContent = '₹0';
    document.getElementById('totalFee').textContent = '₹0';
    document.getElementById('confirmPayBtn').style.display = 'none';
    document.getElementById('scannerArea').classList.remove('scanned', 'scanning');
    feeCalculated = false;
}

// ===== INCIDENTS =====
let incidents = [];
function seedIncidents() {
    const types = ['Traffic Jam', 'Illegal Parking', 'Speeding Violation', 'Signal Malfunction'];
    const locs = ['Sector 4', 'Main Gate', 'Zone B Entry', 'Highway Ramp'];
    const sevs = ['high', 'medium', 'low'];
    for (let i = 0; i < 4; i++) {
        incidents.push({
            id: i + 1,
            type: types[i], loc: locs[i], sev: sevs[i % 3],
            time: new Date(Date.now() - Math.random() * 3600000).toLocaleTimeString(),
            resolved: false
        });
    }
    renderIncidents();
}

function submitIncident() {
    const type = document.getElementById('incidentType').value;
    const loc = document.getElementById('incidentLoc').value || 'Unknown';
    const sev = document.getElementById('incidentSev').value;
    incidents.unshift({ id: Date.now(), type, loc, sev, time: new Date().toLocaleTimeString(), resolved: false });
    renderIncidents();
    showToast("Incident logged: " + type, "warn");
    document.getElementById('incidentLoc').value = '';
    document.getElementById('incidentDesc').value = '';
    document.getElementById('kpi-violations').textContent = parseInt(document.getElementById('kpi-violations').textContent) + 1;
}

function renderIncidents() {
    const list = document.getElementById('incidentList');
    if (!list) return;
    list.innerHTML = '';
    incidents.filter(i => !i.resolved).forEach(inc => {
        const el = document.createElement('div');
        el.className = `incident-item sev-${inc.sev}`;
        el.innerHTML = `
            <div class="inc-left"><span class="inc-badge ${inc.sev}">${inc.sev.toUpperCase()}</span><span class="inc-type">${inc.type}</span><span class="inc-loc"><i class="fas fa-map-marker-alt"></i> ${inc.loc}</span></div>
            <div class="inc-right"><small>${inc.time}</small><button class="btn-sm-success" onclick="resolveIncident(${inc.id})"><i class="fas fa-check"></i> Resolve</button></div>
        `;
        list.appendChild(el);
    });
    if (list.children.length === 0) list.innerHTML = '<p style="color:#718096;padding:15px;">No active incidents.</p>';
}

function resolveIncident(id) {
    incidents = incidents.map(i => i.id === id ? { ...i, resolved: true } : i);
    renderIncidents();
    showToast("Incident resolved.", "success");
}

function addIncident() {
    showPage('incidents', document.querySelectorAll('.nav-link')[4]);
}

// ===== HEATMAP =====
const roadLabels = ['Gate 1', 'Gate 2', 'Zone A', 'Zone B', 'Zone C', 'Highway', 'Inner Road', 'Roundabout'];
const timeProfiles = {
    'Peak Hours (8AM–10AM)': [9, 8, 7, 5, 4, 10, 8, 9],
    'Afternoon (12PM–2PM)': [5, 4, 6, 5, 3, 7, 5, 4],
    'Evening Rush (5PM–8PM)': [8, 9, 7, 8, 6, 10, 9, 8],
    'Night (10PM–12AM)': [2, 1, 3, 2, 1, 4, 2, 1]
};

function renderHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const timeKey = document.getElementById('heatmapTime')?.value || 'Peak Hours (8AM–10AM)';
    const profile = timeProfiles[timeKey] || timeProfiles['Peak Hours (8AM–10AM)'];
    roadLabels.forEach((label, i) => {
        const row = document.createElement('div');
        row.className = 'heatmap-row';
        row.innerHTML = `<span class="hm-label">${label}</span>`;
        for (let h = 0; h < 24; h++) {
            const base = profile[i];
            const val = Math.max(0, Math.min(10, base + (Math.random() * 4 - 2)));
            const cell = document.createElement('div');
            cell.className = 'hm-cell';
            const colors = ['#10b98122', '#10b98155', '#f59e0b55', '#f59e0baa', '#ef444455', '#ef4444aa', '#ef4444', '#7c3aed99', '#7c3aed', '#7c3aedcc', '#6d28d9'];
            cell.style.background = colors[Math.floor(val)];
            cell.title = `${label} — ${h}:00 — Density: ${val.toFixed(1)}/10`;
            row.appendChild(cell);
        }
        grid.appendChild(row);
    });
}

// ===== QUICK ACTIONS =====
function triggerAlert() {
    document.getElementById('alertModal').style.display = 'flex';
}

function broadcastAlert() {
    document.getElementById('alertModal').style.display = 'none';
    showToast("🚨 Emergency Alert Broadcast to all zones!", "danger");
}

// ===== SPARKLINES =====
function drawSparklines() {
    [[1, [30, 45, 38, 55, 70, 60, 82]], [2, [20, 35, 28, 45, 60, 55, 72]], [3, [3, 7, 5, 8, 6, 9, 7]]].forEach(([n, data]) => {
        const canvas = document.getElementById(`sparkline${n}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        const max = Math.max(...data), min = Math.min(...data);
        ctx.clearRect(0, 0, w, h);
        ctx.beginPath();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        data.forEach((v, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - ((v - min) / (max - min)) * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    });
}

// ===== EXCEL DOWNLOAD =====
function downloadExcel(name) {
    const csvData = `data:text/csv;charset=utf-8,ID,Timestamp,Location,Status,Details\n1,${new Date().toISOString()},Main Gate,Completed,Generated by TPMS v3.0\n2,${new Date().toISOString()},Zone B,Pending,Auto-captured`;
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvData));
    link.setAttribute("download", `${name}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${name} downloaded!`, "success");
}

// ===== TOAST NOTIFICATIONS =====
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
}

// ===== LOGOUT =====
function handleLogout() {
    if (confirm("Sign out of the system?")) {
        document.getElementById('app-body').innerHTML = `
            <div style="height:100vh;width:100vw;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#060810;color:white;text-align:center;font-family:'Rajdhani',sans-serif;">
                <i class="fas fa-lock" style="font-size:3.5rem;color:#00d4ff;margin-bottom:25px;"></i>
                <h2 style="font-family:'Orbitron',monospace;letter-spacing:3px;">SESSION TERMINATED</h2>
                <p style="color:#718096;margin-top:10px;">You have been safely logged out of TPMS v3.0</p>
                <button onclick="location.reload()" style="margin-top:25px;padding:12px 30px;background:linear-gradient(135deg,#00d4ff,#0066ff);border:none;color:white;border-radius:6px;cursor:pointer;font-weight:bold;font-family:'Orbitron',monospace;letter-spacing:2px;">LOGIN AGAIN</button>
            </div>`;
    }
}

// ===== INIT =====
window.onload = () => {
    buildParkingGrid('A');
    initTrafficSimulation();
    initEmergencySimulation();
    initVideoHandlers();
};
