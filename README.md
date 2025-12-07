# Logistics Management System

A microservices-based logistics platform built with **FastAPI** (Python), **Nginx** (Gateway), and **PostgreSQL**.

## Architecture

The system consists of 5 core microservices:
1.  **Gateway Service** (Nginx): Reverse proxy and Static Frontend.
2.  **Auth Service** (FastAPI): User management and JWT authentication.
3.  **Orders Service** (FastAPI): Order creation and management.
4.  **Warehouse Service** (FastAPI): Inventory management.
5.  **Tracking Service** (FastAPI): Order shipment tracking.

And infrastructure:
-   **PostgreSQL**: Single database instance.
-   **Docker Compose**: Orchestration.

## Getting Started

### Prerequisites
-   Docker & Docker Compose

### Installation
1.  Clone the repository.
2.  Run:
    ```bash
    docker-compose up -d --build
    ```
3.  Access the application at `http://localhost`.

## User Guide (Frontend)

### 1. Authorization
-   **Login**: Use your credentials or the default admin (if created).
-   **Register**: Click "New here? Register" to create a new account.
-   **Admin**: Login with `admin`/`admin` (if setup) to see Admin tabs.

### 2. Dashboard
-   Displays real-time stats (Active Orders, Stock Level).
-   Quick shortcuts to create orders or track items.

### 3. Warehouse (Inventory)
-   View all available items.
-   **Add to Order**: Click `+` on an item to start an order with it.
-   **Add Stock**: (Open Access for demo) Add new items/quantity at the bottom.

### 4. Orders
-   **My Orders**: View your history.
-   **Create Order**:
    1.  Select Item from the dropdown.
    2.  Set Quantity -> "Add to Draft".
    3.  Click "Submit Order" to finalize.

### 5. Tracking
-   Enter an Order ID to see its status timeline.
-   Click "Track" on any order in the Orders list to auto-fill the tracking page.

## API Documentation
Each service exposes raw metrics at `/metrics`.
-   Auth: `http://localhost/register`, `http://localhost/login`
-   Orders: `http://localhost/orders`
-   Warehouse: `http://localhost/items`
-   Tracking: `http://localhost/tracking`
