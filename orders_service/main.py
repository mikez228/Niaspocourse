from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import time
import asyncpg
import json
import random
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

app = FastAPI()

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@postgres:5432/logistics")

# Prometheus Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP Requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP Request Duration', ['method', 'endpoint'])

# Models
class OrderCreate(BaseModel):
    user_id: int
    items: Dict[str, int]

# Database connection
async def get_db_connection():
    return await asyncpg.connect(DATABASE_URL)

# Middleware for metrics
@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path, status=response.status_code).inc()
    REQUEST_LATENCY.labels(method=request.method, endpoint=request.url.path).observe(process_time)
    
    return response

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/orders", status_code=status.HTTP_201_CREATED)
async def create_order(order: OrderCreate):
    conn = await get_db_connection()
    try:
        # Lazy migration for tracking_number
        try:
            await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(10)")
        except asyncpg.exceptions.DuplicateColumnError:
            pass

        tracking_number = str(random.randint(1000, 9999))
        items_json = json.dumps(order.items)
        row = await conn.fetchrow(
            "INSERT INTO orders (user_id, items, tracking_number) VALUES ($1, $2, $3) RETURNING id",
            order.user_id, items_json, tracking_number
        )
        return {"id": row['id'], "status": "pending", "tracking_number": tracking_number}
    finally:
        await conn.close()

@app.get("/orders")
async def get_orders():
    conn = await get_db_connection()
    try:
        # Ensure we don't crash if column missing (though create_order adds it)
        try:
            rows = await conn.fetch("SELECT * FROM orders ORDER BY created_at DESC")
        except:
            return []

        return [
            {
                "id": row['id'],
                "user_id": row['user_id'],
                "status": row['status'],
                "items": json.loads(row['items']),
                "created_at": str(row['created_at']),
                "tracking_number": row.get('tracking_number')
            }
            for row in rows
        ]
    finally:
        await conn.close()

@app.get("/orders/track/{tracking_number}")
async def track_order_by_number(tracking_number: str):
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM orders WHERE tracking_number = $1", tracking_number)
        if not row:
            raise HTTPException(status_code=404, detail="Tracking number not found")
        
        return {
            "id": row['id'],
            "status": row['status'],
            "items": json.loads(row['items']),
            "created_at": str(row['created_at']),
            "tracking_number": row['tracking_number']
        }
    finally:
        await conn.close()

@app.get("/orders/{order_id}")
async def get_order(order_id: int):
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM orders WHERE id = $1", order_id)
        if not row:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return {
            "id": row['id'],
            "user_id": row['user_id'],
            "status": row['status'],
            "items": json.loads(row['items']),
            "created_at": str(row['created_at'])
        }
    finally:
        await conn.close()

@app.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: int):
    conn = await get_db_connection()
    try:
        result = await conn.execute("DELETE FROM orders WHERE id = $1", order_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Order not found")
        return
    finally:
        await conn.close()

@app.get("/health")
def health():
    return {"status": "ok"}
