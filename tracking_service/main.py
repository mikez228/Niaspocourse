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
class TrackingCreate(BaseModel):
    order_id: int
    location: str
    status: str

class TrackingUpdate(BaseModel):
    location: str
    status: str

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
@app.post("/tracking", status_code=status.HTTP_201_CREATED)
async def create_tracking(tracking: TrackingCreate):
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            "INSERT INTO tracking (order_id, location, status) VALUES ($1, $2, $3) RETURNING id",
            tracking.order_id, tracking.location, tracking.status
        )
        return {"id": row['id'], "message": "Tracking info created"}
    finally:
        await conn.close()

@app.get("/tracking/{order_id}")
async def get_tracking(order_id: int):
    conn = await get_db_connection()
    try:
        rows = await conn.fetch("SELECT * FROM tracking WHERE order_id = $1 ORDER BY updated_at DESC", order_id)
        if not rows:
            raise HTTPException(status_code=404, detail="Tracking info not found")
        
        return [
            {
                "id": row['id'],
                "order_id": row['order_id'],
                "location": row['location'],
                "status": row['status'],
                "updated_at": str(row['updated_at'])
            }
            for row in rows
        ]
    finally:
        await conn.close()

@app.get("/health")
def health():
    return {"status": "ok"}
