# Tracking Service

Handles order tracking information.

## Endpoints

- `POST /tracking`: Create tracking info.
- `GET /tracking/{order_id}`: Get tracking history for an order.
- `GET /metrics`: Prometheus metrics.
- `GET /health`: Health check.

## Environment Variables

- `DATABASE_URL`: Connection string for PostgreSQL.
