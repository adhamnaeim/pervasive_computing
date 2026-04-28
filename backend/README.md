# Backend – FastAPI

REST API connecting to the MariaDB database on the Raspberry Pi.

## Setup

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Fill in your credentials in `.env`:

   ```env
   DB_HOST=192.168.1.188
   DB_PORT=3306
   DB_NAME=waterq
   DB_USER=admin420
   DB_PASSWORD=admin420
   ```

3. Run the server:

   ```bash
   uvicorn main:app --reload
   ```

## Endpoints

| Method | URL | Description |
|---|---|---|
| GET | `http://192.168.1.188:8000/api/measurements/latest` | Returns last 20 measurements |
| GET | `http://192.168.1.188:8000/api/devices` | Returns all active devices |
