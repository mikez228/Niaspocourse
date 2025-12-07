from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
import os
import time
import asyncpg
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

app = FastAPI()

# Environment variables
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@postgres:5432/logistics")

# Prometheus Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP Requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP Request Duration', ['method', 'endpoint'])

# Models
class ItemCreate(BaseModel):
    item_name: str
    quantity: int

class Item(BaseModel):
    id: int
    item_name: str
    quantity: int

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

# Routes
@app.post("/items", status_code=status.HTTP_201_CREATED)
async def create_item(item: ItemCreate):
    conn = await get_db_connection()
    try:
        # Check if item exists
        existing_item = await conn.fetchrow("SELECT id FROM warehouse WHERE item_name = $1", item.item_name)
        if existing_item:
            raise HTTPException(status_code=400, detail="Item already exists")

        row = await conn.fetchrow(
            "INSERT INTO warehouse (item_name, quantity) VALUES ($1, $2) RETURNING id",
            item.item_name, item.quantity
        )
        return {"id": row['id'], "message": "Item created"}
    finally:
        await conn.close()

@app.get("/items")
async def get_items():
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("SELECT * FROM warehouse")
        return [
            {"id": row['id'], "item_name": row['item_name'], "quantity": row['quantity']}
            for row in rows
        ]
    finally:
        await conn.close()

@app.get("/items/{item_id}")
async def get_item(item_id: int):
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM warehouse WHERE id = $1", item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")
        
        return {
            "id": row['id'],
            "item_name": row['item_name'],
            "quantity": row['quantity']
        }
    finally:
        await conn.close()



@app.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: int):
    conn = await get_db_connection()
    try:
        result = await conn.execute("DELETE FROM warehouse WHERE id = $1", item_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Item not found")
        return
    finally:
        await conn.close()

@app.get("/health")
def health():
    return {"status": "ok"}
