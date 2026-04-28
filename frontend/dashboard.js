const evtSource = new EventSource("http://192.168.1.188:8000/events");

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("New measurement received:", data);
    
    document.getElementById("temp-sensor").innerText = data.temp_c ?? "N/A";
    document.getElementById("humidity-sensor").innerText = data.humidity ?? "N/A";
    document.getElementById("dust-sensor").innerText = data.dust_pcs ?? "N/A";
    document.getElementById("co2-sensor").innerText = data.co2_ppm ?? "N/A";
};

evtSource.onerror = function(err) {
    console.error("SSE connection lost:", err);
};