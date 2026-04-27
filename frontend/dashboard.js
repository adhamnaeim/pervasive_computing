const evtSource = new EventSource("http://ourBackendIP:port/events");

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("New measurement received:", data);
    
    // Update UI elements here
    //TODO add ui elements by id here
    document.getElementById("temp-sensor").innerText = data.temperature;
    document.getElementById("humidity-sensor").innerText = data.temperature;
    document.getElementById("dust-sensor").innerText = data.temperature;
    document.getElementById("co2-sensor").innerText = data.temperature;
    document.getElementById("co-sensor").innerText = data.temperature;
};

evtSource.onerror = function(err) {
    console.error("EventSource failed:", err);
};