const evtSource = new EventSource("http://192.168.1.188:8000/events");

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("New measurement received:", data);
    
    document.getElementById("timestamp").innerText = `Last updated: ${data.ts}`;
    if (data.temp_c != null) document.getElementById("temp-sensor").innerText = `${data.temp_c} °C`;
    if (data.humidity != null) document.getElementById("humidity-sensor").innerText = `${data.humidity} %`;
    if (data.dust_pcs != null) document.getElementById("dust-sensor").innerText = `${data.dust_pcs} ppm`;
    if (data.co2_ppm != null) document.getElementById("co2-sensor").innerText = `${data.co2_ppm} ppm`;
};

evtSource.onerror = function(err) {
    console.error("SSE connection lost:", err);
};