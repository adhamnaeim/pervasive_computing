const API_BASE = "http://192.168.1.188:8000";
const evtSource = new EventSource(`${API_BASE}/events`);

const THRESHOLDS = {
    temp: {max: 30},
    humidity: {min: 10, max: 60},
    dust: {max: 3000},
    co2: {max: 800}
}

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data && data.ts != null) {
        document.getElementById("timestamp").innerText = `Last update: ${formatDateTime(data.ts)}`;
    }
    refreshGrid();
};

evtSource.onerror = function(err) {
    console.error("SSE connection lost:", err);
};

function formatDateTime(tsStr) {
    const d = new Date(tsStr);
    const day   = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year  = d.getFullYear();
    const hh    = String(d.getHours()).padStart(2, '0');
    const mm    = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hh}:${mm}`;
}

function updateSensor(id, value, threshold, unit, ts) {
    const element  = document.getElementById(id);
    const parentEl = element.parentElement;
    const tsEl     = document.getElementById(`Last updated: ${id}-ts`);

    element.innerText = `${value} ${unit}`;
    if (tsEl && ts) tsEl.innerText = formatDateTime(ts);

    const lowerThanThreshold  = threshold.max !== undefined && value > threshold.max;
    const higherThanThreshold = threshold.min !== undefined && value < threshold.min;

    if (higherThanThreshold || lowerThanThreshold) {
        parentEl.classList.add("highlight");
    } else {
        parentEl.classList.remove("highlight");
    }
}

async function refreshGrid() {
    try {
        const [tempRows, humRows, co2Rows, dustRows] = await Promise.all([
            fetch(`${API_BASE}/api/measurements/today/temperature`).then(r => r.json()),
            fetch(`${API_BASE}/api/measurements/today/humidity`).then(r => r.json()),
            fetch(`${API_BASE}/api/measurements/today/co2`).then(r => r.json()),
            fetch(`${API_BASE}/api/measurements/today/dust`).then(r => r.json()),
        ]);

        const last = arr => arr.length ? arr[arr.length - 1] : null;

        const t = last(tempRows);
        const h = last(humRows);
        const c = last(co2Rows);
        const d = last(dustRows);

        if (t) updateSensor("temp-sensor",     t.temp_c,   THRESHOLDS.temp,     "°C",  t.ts);
        if (h) updateSensor("humidity-sensor", h.humidity, THRESHOLDS.humidity, "%",   h.ts);
        if (c) updateSensor("co2-sensor",      c.co2_ppm,  THRESHOLDS.co2,      "ppm", c.ts);
        if (d) updateSensor("dust-sensor",     d.dust_pcs, THRESHOLDS.dust,     "pcs", d.ts);
    } catch (e) {
        console.error("Failed to refresh grid", e);
    }
}

// Initial grid load + refresh every 30 s
refreshGrid();
setInterval(refreshGrid, 30000);

// ── Line chart ───────────────────────────────────────────────

const SENSOR_CONFIG = {
    temperature: { url: `${API_BASE}/api/measurements/today/temperature`, key: "temp_c",   label: "Temperature (°C)", color: "rgb(220, 80, 60)",  bg: "rgba(220, 80, 60, 0.15)" },
    humidity:    { url: `${API_BASE}/api/measurements/today/humidity`,    key: "humidity", label: "Humidity (%)",      color: "rgb(60, 130, 220)", bg: "rgba(60, 130, 220, 0.15)" },
    dust:        { url: `${API_BASE}/api/measurements/today/dust`,        key: "dust_pcs",label: "Dust (pcs)",        color: "rgb(180, 120, 40)", bg: "rgba(180, 120, 40, 0.15)" },
    co2:         { url: `${API_BASE}/api/measurements/today/co2`,         key: "co2_ppm", label: "CO2 (ppm)",         color: "rgb(70, 132, 50)",  bg: "rgba(70, 132, 50, 0.15)" },
};

function formatTime(tsStr) {
    const d = new Date(tsStr);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

const sensorChart = new Chart(
    document.getElementById("chart-sensor").getContext("2d"),
    {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "",
                data: [],
                borderWidth: 2,
                pointRadius: 2,
                fill: true,
                tension: 0.3,
                spanGaps: false,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { maxTicksLimit: 10, maxRotation: 0 } },
                y: { beginAtZero: false },
            }
        }
    }
);

async function loadSelectedSensor() {
    const sensor = document.getElementById("sensor-select").value;
    const cfg = SENSOR_CONFIG[sensor];
    try {
        const rows = await fetch(cfg.url).then(r => r.json());
        sensorChart.data.labels = rows.map(r => formatTime(r.ts));
        sensorChart.data.datasets[0].data = rows.map(r => r[cfg.key]);
        sensorChart.data.datasets[0].label = cfg.label;
        sensorChart.data.datasets[0].borderColor = cfg.color;
        sensorChart.data.datasets[0].backgroundColor = cfg.bg;
        sensorChart.options.scales.y.title = { display: true, text: cfg.label };
        sensorChart.update();
    } catch (e) {
        console.error("Failed to load sensor data", e);
    }
}

document.getElementById("sensor-select").addEventListener("change", loadSelectedSensor);

// Initial load + refresh every 30 s
loadSelectedSensor();
setInterval(loadSelectedSensor, 30000);

// Also refresh whenever a new SSE measurement arrives
evtSource.addEventListener("message", () => loadSelectedSensor());