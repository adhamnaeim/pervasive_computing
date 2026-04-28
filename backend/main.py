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
               m.co2_ppm, m.co_ppm, m.dust_pcs,
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
                       m.co2_ppm, m.co_ppm, m.dust_pcs,
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