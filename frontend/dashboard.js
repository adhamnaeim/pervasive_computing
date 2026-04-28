const evtSource = new EventSource("http://ourBackendIP:port/events");

evtSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log("New measurement received:", data);
    
    document.getElementById("temp-sensor").innerText = ##TODO## //e.g. data.temperature;
    document.getElementById("humidity-sensor").innerText = ##TODO## ;
    document.getElementById("dust-sensor").innerText =##TODO## ;
    document.getElementById("co2-sensor").innerText = ##TODO## ;
};

evtSource.onerror = function(err) {
    console.error("EventSource failed:", err);
};