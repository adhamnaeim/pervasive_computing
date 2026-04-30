# Allergy Exposure Data Portal

A real-time air quality monitoring system built on a LoRaWAN IoT pipeline. An ESP32 sensor node measures environmental data (temperature, humidity, CO₂, and dust) and transmits it over LoRaWAN to The Things Network. Messages are consumed via MQTT, normalized by MQTTSuite, stored in MariaDB on a Raspberry Pi, and streamed live to a browser dashboard via Server-Sent Events.

```
ESP32 → LoRa → TTN Gateway → TTN → MQTT → MQTTSuite → MariaDB → FastAPI → SSE → Dashboard
```

---

## Hardware

| Component | Model | Quantity |
|-----------|-------|----------|
| Microcontroller | AZDelivery ESP32 NodeMCU | 1 |
| Backend server | Raspberry Pi 4 Model B | 1 |
| Router | GL-MT3000 Beryl AX (OpenWRT) | 1 |
| Temperature + Humidity sensor | SHT31 | 1 |
| Dust sensor | PPD42NS | 1 |
| CO₂ sensor | MQ-135 | 1 |
| LoRa module | SX1262 | 1 |

---

## Software Versions

| Software | Version |
|----------|---------|
| Arduino IDE | 2.3.8 |
| OpenWRT | 25.12.0 |
| Raspberry Pi OS | 64-bit (Bookworm) |
| Raspberry Pi Imager | 2.0.7 |
| Visual Studio Code + PlatformIO | latest |
| MariaDB | system default |
| SNode.C | compiled from source |
| MQTTSuite (mqttcli) | 1.0-rc1 |
| FastAPI | 0.136.1 |
| uvicorn | 0.46.0 |
| mysql-connector-python | 9.7.0 |
| python-dotenv | 1.2.2 |
| sse-starlette | 2.3.6 |
| LoRaWAN Specification | 1.1.0 |
| Regional Parameters | RP001 1.1 revision A |

---

## Repository Structure

```
pervasive_computing/
├── firmware/               # ESP32 PlatformIO firmware
│   └── LoRaWAN-HelloWorld-radiolib/
├── backend/                # FastAPI backend
│   └── main.py
├── frontend/               # Browser dashboard
│   ├── index.html
│   ├── style.css
│   └── dashboard.js
├── mqtt-processing/        # MQTTSuite config and Mqtt.cpp
├── docs/
│   └── 00-setup.md         # IP addresses, credentials, setup notes
├── start.sh                # Launch script
└── README.md
```

---

## Network & Access

| Resource | Value |
|----------|-------|
| Router IP | `192.168.1.1` |
| Raspberry Pi IP | `192.168.1.188` |
| Raspberry Pi hostname | `admin420` |
| SSH command | `ssh admin420@192.168.1.188` |
| Dashboard URL | `http://192.168.1.188:8080` |
| Backend API | `http://192.168.1.188:8000` |

---

## Backend API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/measurements/latest` | Latest 20 events |
| `GET /api/devices` | List of registered devices |
| `GET /events` | SSE route |

---

## TTN Configuration

| Field | Value |
|-------|-------|
| Console | https://eu1.cloud.thethings.network/console |
| Application ID | `pervasivecomputingcoolrouter` |
| Device ID | `coolrouter-esp32` |
| Frequency Plan | Europe 863–870 MHz (SF9 for RX2) |
| LoRaWAN Version | 1.1.0 |
| Activation | OTAA |
| JoinEUI | `0000000000000000` |
| DevEUI | `70B3D57ED00771C2` |

---

## ESP32 Wiring — SX1262 LoRa Module

| Wire colour | Signal | ESP32 Pin |
|-------------|--------|-----------|
| Black | Ground | GND |
| Yellow | 3.3V | 3V3 |
| Green | MISO | G19 |
| Orange | MOSI | G23 |
| Blue | CS (NSS) | G5 |
| Brown | CLK (SCK) | G18 |
| White | DIO1 | G26 |

---

## Payload Structure

The ESP32 sends sensor data on separate fPorts:

| fPort | Sensor | Fields |
|-------|--------|--------|
| 1 | Temperature + Humidity | `temperature` (float °C), `humidity` (float %) |
| 2 | CO₂ | `CO2` (float ppm) |
| 4 | Dust | `dust` (int pcs/0.01cf) |

---

## Database Schema

**Database:** `waterq`  
**User:** `snodec`

```sql
CREATE TABLE devices (
  device_id VARCHAR(64) PRIMARY KEY,
  name      VARCHAR(128),
  active    BOOLEAN DEFAULT TRUE
);

CREATE TABLE measurements (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  device_id  VARCHAR(64) NOT NULL,
  ts         TIMESTAMP NOT NULL,
  temp_c     FLOAT NULL,
  humidity   FLOAT NULL,
  co2_ppm    FLOAT NULL,
  dust_pcs   INT NULL,
  raw_json   LONGTEXT NULL,
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
```

---

## Running the Project

### Prerequisites

- Raspberry Pi reachable on `192.168.1.188`
- All services installed (MariaDB, SNode.C, MQTTSuite, Python dependencies)

### Start everything

```bash
cd ~/pervasive_computing
./start.sh
```

This launches three processes:
1. **MQTTSuite** (`mqttcli`) — subscribes to TTN MQTT and inserts measurements into MariaDB
2. **FastAPI backend** (`uvicorn`) — REST API on port `8000`
3. **Frontend server** (`python3 -m http.server`) — dashboard on port `8080`

### Access the dashboard

Open in any browser on the local network:
```
http://192.168.1.188:8080
```

---

## MQTT Configuration

The mqttcli config is saved at `~/.config/snode.c/mqttcli.conf`. Simply run:

```bash
mqttcli
```

To reconfigure manually:

```bash
mqttcli in-mqtts --disabled=false \
  session --username pervasivecomputingcoolrouter@ttn \
           --password <IN_THE_REPORT> \
  remote --host eu1.cloud.thethings.network --port 8883 \
  sub --topic "v3/pervasivecomputingcoolrouter@ttn/devices/+/up" \
  db --host localhost --username snodec --password admin420 --database waterq
```

---

## SSH Key Setup (Windows)

IN_THE_REPORT
```

Connect:
```powershell
ssh admin420@192.168.1.188
```

---

## Known Issues & Fixes

| Problem | Fix |
|---------|-----|
| Router flashed with wrong firmware | Use sysupgrade image, not factory snapshot |
| SSH key rejected after reflash | Run `ssh-keygen -R 192.168.1.188`, then reconnect |
| Wrong username in SSH (`pi` not found) | Use username set in Raspberry Pi Imager (`admin420`) |
| `mysql-server` not found on Pi | Use `mariadb-server` instead |
| MQTTSuite inserting into wrong table | Edit `Mqtt.cpp` to use correct table name (`measurements`) |
| Backend 500 error on startup | Grant privileges: `GRANT ALL PRIVILEGES ON waterq.* TO 'admin420'@'%'; FLUSH PRIVILEGES;` |
| PlatformIO header files not found | Change relative paths to absolute paths in `platformio.ini` |
| FH network blocking package downloads | Use mobile hotspot for downloads |
| `mqttcli` timing out every 60 seconds | Normal — no uplinks arriving, reconnects automatically |

---

## Group

| Name |
|------|
| Adham Mansour |
| Ahmed Shahien |
| Justus Warm |
| Lukas Mensing |
| Moritz Alker |

**Repository:** https://github.com/adhamnaeim/pervasive_computing  
**Project Board:** https://github.com/users/adhamnaeim/projects/1/