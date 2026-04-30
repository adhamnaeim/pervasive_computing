const evtSource = new EventSource("http://192.168.1.188:8000/events");

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("New measurement received:", data);
    
    document.getElementById("timestamp").innerText = data.ts != null ? `Last updated: ${data.ts}` : "N/A";
    document.getElementById("temp-sensor").innerText = data.temp_c != null ? `${data.temp_c} °C` : "N/A";
    document.getElementById("humidity-sensor").innerText = data.humidity != null ? `${data.humidity} %` : "N/A";
    document.getElementById("dust-sensor").innerText = data.dust_pcs != null ? `${data.dust_pcs} ppm` : "N/A";
    document.getElementById("co2-sensor").innerText = data.co2_ppm != null ? `${data.co2_ppm} ppm` : "N/A";
};

evtSource.onerror = function(err) {
    console.error("SSE connection lost:", err);
};