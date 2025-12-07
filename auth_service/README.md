# Auth Service

Handles user registration and authentication.

## Endpoints

- `POST /register`: Register a new user.
- `POST /login`: Login and get JWT.
- `GET /verify`: Verify a token.
- `GET /metrics`: Prometheus metrics.
- `GET /health`: Health check.

## Environment Variables

- `DATABASE_URL`: Connection string for PostgreSQL.
- `SECRET_KEY`: Secret key for JWT.
