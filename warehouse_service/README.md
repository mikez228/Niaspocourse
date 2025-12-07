# Warehouse Service

Handles inventory management.

## Endpoints

- `POST /items`: Create a new item.
- `GET /items/{id}`: Get item details.
- `GET /metrics`: Prometheus metrics.
- `GET /health`: Health check.

## Environment Variables

- `DATABASE_URL`: Connection string for PostgreSQL.
