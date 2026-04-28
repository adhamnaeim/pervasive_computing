const evtSource = new EventSource("http://localhost:8000/events");

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    document.getElementById("temp-sensor").innerText = data.temp_c ?? "N/A";
    document.getElementById("humidity-sensor").innerText = data.humidity ?? "N/A";
    document.getElementById("dust-sensor").innerText = data.dust_pcs ?? "N/A";
    document.getElementById("co2-sensor").innerText = data.co2_ppm ?? "N/A";
    document.getElementById("co-sensor").innerText = data.co_ppm ?? "N/A";
};

evtSource.onerror = function(err) {
    console.error("SSE connection lost:", err);
};