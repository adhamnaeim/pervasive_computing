#!/bin/bash

echo "Starting MQTTSuite..."
mqttcli &

echo "Starting backend..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

echo "Starting frontend server..."
cd frontend
python3 -m http.server 8080