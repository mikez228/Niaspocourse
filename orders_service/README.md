# Orders Service

Handles order creation and retrieval.

## Endpoints

- `POST /orders`: Create a new order.
- `GET /orders/{id}`: Get order details.
- `GET /metrics`: Prometheus metrics.
- `GET /health`: Health check.

## Environment Variables

- `DATABASE_URL`: Connection string for PostgreSQL.
