/*

This demonstrates how to save the join information in to permanent memory
so that if the power fails, batteries run out or are changed, the rejoin
is more efficient & happens sooner due to the way that LoRaWAN secures
the join process - see the wiki for more details.

This is typically useful for devices that need more power than a battery
driven sensor - something like a air quality monitor or GPS based device that
is likely to use up it's power source resulting in loss of the session.

The relevant code is flagged with a ##### comment

Saving the entire session is possible but not demonstrated here - it has
implications for flash wearing and complications with which parts of the
session may have changed after an uplink. So it is assumed that the device
is going in to deep-sleep, as below, between normal uplinks.

Once you understand what happens, feel free to delete the comments and
Serial.prints - we promise the final result isn't that many lines.

*/

#if !defined(ESP32)
#pragma error("This is not the example your device is looking for - ESP32 only")
#endif

#include <Preferences.h>

RTC_DATA_ATTR uint16_t bootCount = 0;

#include "GPS.h"
#include "LoRaWAN.hpp"
#include <DHT.h>

#define DHTPIN 15       // Data pin
#define DHTTYPE DHT11   // Sensor type
#define DUSTPIN 16      // Dust sensor data pin

// CO2 defines
#define MQ135PIN 34     // MQ135 CO2 sensor data pin
#define ADC_MAX 4095.0
#define V_ADC 3.3
#define VCC 5.0 
#define RL 10000.0      // Sensor resistor
#define R1 10000.0      // Voltage divider resistor 1
#define R2 20000.0      // Voltage divider resistor 2
#define R0 81626.35     // sensor baseline calibration
#define A 132.32        // curve parameter 1
#define B -2.95         // curve parameter 2

unsigned long duration;
unsigned long starttime;
unsigned long sampletime_ms = 2000;//sampe 30s&nbsp;;
unsigned long lowpulseoccupancy = 0;
float ratio = 0;
float concentration = 0;

static GAIT::LoRaWAN<RADIOLIB_LORA_MODULE> loRaWAN(RADIOLIB_LORA_REGION,
                                                   RADIOLIB_LORAWAN_JOIN_EUI,
                                                   RADIOLIB_LORAWAN_DEV_EUI,
                                                   (uint8_t[16]) {RADIOLIB_LORAWAN_APP_KEY},
#ifdef RADIOLIB_LORAWAN_NWK_KEY
                                                   (uint8_t[16]) {RADIOLIB_LORAWAN_NWK_KEY},
#else
                                                   nullptr,
#endif
                                                   RADIOLIB_LORA_MODULE_BITMAP);

static GAIT::GPS gps(GPS_SERIAL_PORT, GPS_SERIAL_BAUD_RATE, GPS_SERIAL_CONFIG, GPS_SERIAL_RX_PIN, GPS_SERIAL_TX_PIN);
static DHT dht(DHTPIN, DHTTYPE);

// abbreviated version from the Arduino-ESP32 package, see
// https://espressif-docs.readthedocs-hosted.com/projects/arduino-esp32/en/latest/api/deepsleep.html
// for the complete set of options
void print_wakeup_reason() {
    esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
    if (wakeup_reason == ESP_SLEEP_WAKEUP_TIMER) {
        Serial.println(F("Wake from sleep"));
    } else {
        Serial.print(F("Wake not caused by deep sleep: "));
        Serial.println(wakeup_reason);
    }

    Serial.print(F("Boot count: "));
    Serial.println(++bootCount); // increment before printing
}

void goToSleep(uint32_t seconds) {
    loRaWAN.goToSleep();
    gps.goToSleep();

    Serial.println("[APP] Go to sleep");
    Serial.println();

    esp_sleep_enable_timer_wakeup(seconds * 1000UL * 1000UL); // function uses uS
    esp_deep_sleep_start();

    Serial.println(F("\n\n### Sleep failed, delay of 5 minutes & then restart ###\n"));
    delay(5UL * 60UL * 1000UL);
    ESP.restart();
}

void setup() {
    Serial.begin(115200);
    analogSetAttenuation(ADC_11db);

    pinMode(DUSTPIN,INPUT);

    starttime = millis();//get the current time;
    while (!Serial)
        ;        // wait for serial to be initalised
    delay(2000); // give time to switch to the serial monitor

    dht.begin();

    print_wakeup_reason();

    Serial.println(F("Setup"));
    loRaWAN.setup(bootCount);

    loRaWAN.setDownlinkCB([](uint8_t fPort, uint8_t* downlinkPayload, std::size_t downlinkSize) {
        Serial.print(F("[APP] Payload: fPort="));
        Serial.print(fPort);
        Serial.print(", ");
        GAIT::arrayDump(downlinkPayload, downlinkSize);
    });
    Serial.println(F("[APP] Aquire data and construct LoRaWAN uplink"));

    std::string uplinkPayload = RADIOLIB_LORAWAN_PAYLOAD;
    uint8_t fPort = 221;

#define SENSOR_COUNT 3

    uint8_t currentSensor = (bootCount - 1) % SENSOR_COUNT; // Starting at zero (0)

    switch (currentSensor) {
        case 0: {
            // Temperature and Humidity
            float humidity = dht.readHumidity();
            float temperature = dht.readTemperature(); // Celsius
            Serial.println(F("[APP] Read DHT11 sensor:"));
            Serial.print(F("  Humidity: "));
            Serial.print(humidity);
            Serial.print(F("%, Temperature: "));
            Serial.print(temperature);
            Serial.println(F("°C"));

            if (!(isnan(humidity) || isnan(temperature))) {
                fPort = currentSensor + 1; // 1 is humidity and temperature
                uplinkPayload = std::to_string(humidity) + "," + std::to_string(temperature);
            }
            break;
        }
            
        case 1: {
            // CO2
            int adc = analogRead(MQ135PIN);
            float Vmeas = (adc / ADC_MAX) * V_ADC;
            float Vout = Vmeas * ((R1 + R2) / R2);
            if (Vout < 0.01) Vout = 0.01;
            float Rs = RL * ((VCC / Vout) - 1.0);
            float ratio = Rs / R0;
            float co2 = A * pow(ratio, B);
            Serial.println(F("[APP] Read CO2 sensor:"));
            Serial.print(F("  CO2: "));
            Serial.print(co2);
            Serial.println(F(" ppm"));

            if (!isnan(co2)) {
                fPort = currentSensor + 1; // 2 is CO2
                uplinkPayload = std::to_string(co2);
            }
            break;
        }
            
        case 2: {
            // Dust Sensor
            lowpulseoccupancy = 0;
            starttime = millis();
            
            Serial.println(F("[APP] Reading Dust sensor for 30 seconds..."));

            while ((millis() - starttime) < 30000) {
                duration = pulseIn(DUSTPIN, LOW);
                lowpulseoccupancy += duration;
            }

            ratio = lowpulseoccupancy / (30000.0 * 10.0);
            concentration = 1.1*pow(ratio,3) - 3.8*pow(ratio,2) + 520*ratio + 0.62;

            Serial.println(F("[APP] Read Dust sensor:"));
            Serial.print(F("  Dust: "));
            Serial.print(concentration);
            Serial.println(F(" pcs/0.01cf"));

            if (!isnan(concentration)) {
                fPort = currentSensor + 1; // 3 is Dust
                uplinkPayload = std::to_string(concentration);
            }
            break;
        }
    }

    loRaWAN.setUplinkPayload(fPort, uplinkPayload);
}

void loop() {
    loRaWAN.loop();
}

// Does it respond to a UBX-MON-VER request?
// uint8_t ubx_mon_ver[] = { 0xB5,0x62,0x0A,0x04,0x00,0x00,0x0E,0x34 };
