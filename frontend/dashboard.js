const evtSource = new EventSource("http://192.168.1.188:8000/events");

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