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
    console.log("New measurement received:", data);
    
    if (data) {
        if(data.ts != null) {
            const date = new Date(data.ts)
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const formattedTime = `${day}.${month}.${year} ${hours}:${minutes}`;
            document.getElementById("timestamp").innerText = `Last updated: ${formattedTime}`;
        }

        if (data.temp_c != null) updateSensor("temp-sensor", data.temp_c, THRESHOLDS.temp, "°C");
        if (data.humidity != null) updateSensor("humidity-sensor", data.humidity, THRESHOLDS.humidity, "%");
        if (data.dust_pcs != null) updateSensor("dust-sensor", data.dust_pcs, THRESHOLDS.dust, "pcs");
        if (data.co2_ppm != null) updateSensor("co2-sensor", data.co2_ppm, THRESHOLDS.co2, "ppm");
    }
};

evtSource.onerror = function(err) {
    console.error("SSE connection lost:", err);
};



function updateSensor(id, value, threshold, unit) {
    const element = document.getElementById(id);
    const parentEl = element.parentElement;

    element.innerText = `${value} ${unit}`;

    const lowerThanThreshold = threshold.max !== undefined && value > threshold.max;
    const higherThanThreshold = threshold.min !== undefined && value < threshold.min;
    
    if (higherThanThreshold || lowerThanThreshold ) {
        parentEl.classList.add("highlight");
    } else {
        parentEl.classList.remove("highlight");
    }
}

// ── Line chart ───────────────────────────────────────────────

const SENSOR_CONFIG = {
    temperature: { url: `${API_BASE}/api/measurements/today/temperature`, key: "temp_c",   label: "Temperature (°C)", color: "rgb(220, 80, 60)",  bg: "rgba(220, 80, 60, 0.15)" },
    humidity:    { url: `${API_BASE}/api/measurements/today/humidity`,    key: "humidity", label: "Humidity (%)",      color: "rgb(60, 130, 220)", bg: "rgba(60, 130, 220, 0.15)" },
    co2:         { url: `${API_BASE}/api/measurements/today/co2`,         key: "co2_ppm", label: "CO2 (ppm)",         color: "rgb(70, 132, 50)",  bg: "rgba(70, 132, 50, 0.15)" },
    dust:        { url: `${API_BASE}/api/measurements/today/dust`,        key: "dust_pcs",label: "Dust (pcs)",        color: "rgb(180, 120, 40)", bg: "rgba(180, 120, 40, 0.15)" },
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