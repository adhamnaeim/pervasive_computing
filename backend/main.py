from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import mysql.connector
from dotenv import load_dotenv
import asyncio
import json
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT")),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

@app.get("/api/measurements/latest")
def get_latest_measurements():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.id, m.device_id, m.ts,
               m.temp_c, m.humidity,
               m.co2_ppm, m.dust_pcs,
               m.raw_json, d.name AS device_name
        FROM measurements m
        LEFT JOIN devices d ON m.device_id = d.device_id
        ORDER BY m.ts DESC
        LIMIT 20
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/api/devices")
def get_devices():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM devices WHERE active = 1")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/api/measurements/today/temperature")
def get_today_temperature():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.ts, m.temp_c
        FROM measurements m
        WHERE DATE(m.ts) = CURDATE()
          AND m.temp_c IS NOT NULL
          AND m.temp_c != 0
          AND m.temp_c BETWEEN -40 AND 60
        ORDER BY m.ts ASC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/api/measurements/today/humidity")
def get_today_humidity():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.ts, m.humidity
        FROM measurements m
        WHERE DATE(m.ts) = CURDATE()
          AND m.humidity IS NOT NULL
          AND m.humidity != 0
          AND m.humidity BETWEEN 1 AND 100
        ORDER BY m.ts ASC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/api/measurements/today/co2")
def get_today_co2():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.ts, m.co2_ppm
        FROM measurements m
        WHERE DATE(m.ts) = CURDATE()
          AND m.co2_ppm IS NOT NULL
          AND m.co2_ppm != 0
          AND m.co2_ppm BETWEEN 1 AND 5000
        ORDER BY m.ts ASC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/api/measurements/today/dust")
def get_today_dust():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT m.ts, m.dust_pcs
        FROM measurements m
        WHERE DATE(m.ts) = CURDATE()
          AND m.dust_pcs IS NOT NULL
          AND m.dust_pcs != 0
          AND m.dust_pcs != 1
          AND m.dust_pcs BETWEEN 1 AND 50000
        ORDER BY m.ts ASC
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

@app.get("/events")
async def sse_events():
    async def event_generator():
        last_id = None
        while True:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
            SELECT m.id, m.device_id, m.ts,
            m.temp_c, m.humidity,
            m.co2_ppm, m.dust_pcs,
               d.name AS device_name
        FROM measurements m
        LEFT JOIN devices d ON m.device_id = d.device_id
        ORDER BY m.ts DESC LIMIT 1
    """)
            row = cursor.fetchone()
            cursor.close()
            conn.close()

            if row and row["id"] != last_id:
                last_id = row["id"]
                yield {"data": json.dumps(row, default=str)}

            await asyncio.sleep(5)

    return EventSourceResponse(event_generator())