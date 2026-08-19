# Arham Fintech — Internal Operations Portal

> Technical Assessment — Stock Broking Internal Operations Portal with Mock BSE API

## Quick Start

### Prerequisites
- **Node.js** v18+ installed
- **npm** v8+

### 1. Clone & Setup

```bash
git clone <repository-url>
cd ArhanFintech_Assignment
```

### 2. Start Mock BSE API (Part A)

```bash
cd mock-bse-api
npm install
npm run seed      # Generate seed data (250 clients, 5000 trades, 20 employees)
npm start         # Starts on http://localhost:4000
```

### 3. Start Portal Backend (Part B — Backend)

```bash
cd portal-backend
npm install
npm start         # Starts on http://localhost:3001
```

The backend automatically syncs employee & mapping data from the Mock BSE API on startup.

### 4. Start Portal Frontend (Part B — Frontend)

```bash
cd portal-frontend
npm install
npm run dev       # Starts on http://localhost:5173
```

### 5. Use the Portal

1. Open **http://localhost:5173** in your browser
2. Select an employee profile to log in (simulated auth)
3. Click **"Sync from BSE"** to pull client & trade data from the Mock BSE API
4. Navigate through all 5 views: Clients, Trades, My Clients, Employees, Incentives

---

## Links

| Service | URL |
|---------|-----|
| Mock BSE API | http://localhost:4000 |
| Portal Backend | http://localhost:3001 |
| Internal Dashboard | http://localhost:5173 |

---

## Project Structure

```
ArhanFintech_Assignment/
├── mock-bse-api/          # Part A — Mock BSE Exchange API
│   ├── server.js          # Express server with simulated delay & failures
│   ├── seed.js            # Generates fake client/trade/employee data
│   └── data/              # Seed data JSON files
│
├── portal-backend/        # Part B — Portal Backend
│   ├── server.js          # Express + Socket.io server
│   ├── db.js              # SQLite database (sql.js)
│   ├── services/
│   │   └── bseSync.js     # On-demand BSE sync with retry & deduplication
│   └── routes/
│       ├── clients.js     # Client endpoints
│       ├── trades.js      # Trade endpoints (filterable)
│       ├── employees.js   # Employee + My Clients endpoints
│       ├── incentives.js  # Incentive calculation
│       └── sync.js        # Sync trigger & status
│
├── portal-frontend/       # Part B — Portal Frontend
│   └── src/
│       ├── App.jsx        # Main app with sidebar, routing, sync bar
│       ├── api.js         # API client
│       ├── socket.js      # Socket.io client for real-time updates
│       └── pages/         # All 5 views
│
├── ARCHITECTURE.md        # Architecture document
└── README.md              # This file
```

---

## Part A — Mock BSE API

Simulates a slow, unreliable BSE Exchange API:

| Endpoint | Behavior |
|----------|----------|
| `GET /api/clients?page=N` | Paginated, configurable delay, ~20% random failure |
| `GET /api/trades?page=N&clientId=X&from=DATE&to=DATE` | Filtered + paginated, same delay/failure |
| `GET /api/internal/employees` | Instant, reliable (no delay, no failures) |
| `GET /api/internal/mappings` | Instant, reliable |
| `GET /api/config` | View current delay/failure config |
| `PUT /api/config` | Update delay at runtime |

**Configuration** (via environment variables or runtime API):
- `BSE_DELAY_MS` — Delay per page in ms (default: 2000, set to 60000 for 10-min simulation)
- `BSE_FAILURE_RATE` — Failure probability (default: 0.2 = 20%)
- `BSE_PAGE_SIZE` — Records per page (default: 50)

---

## Part B — Internal Portal

### Views

| View | Description | Role Access |
|------|-------------|-------------|
| Clients | All clients with search, status/city/segment filters, pagination | All |
| Trades | All trades filterable by client, date range, symbol, type | All |
| My Clients | Only clients mapped to logged-in employee | Employee |
| Employees | All employees with client count, department filter | All |
| Incentives | Brokerage-based incentive calculation | Employee: own / Management: all |

### Hard Requirements Met

1. **< 1 second screen load** — All views serve from SQLite cache instantly, even if BSE is down
2. **Real-time updates** — Socket.io pushes `data-updated` events to all connected clients when fresh data arrives from BSE sync
3. **No cronjob/scheduler** — Sync is triggered on-demand via the "Sync from BSE" button
4. **Retry logic** — Exponential backoff (up to 5 retries) for failed BSE requests
5. **Deduplication** — `INSERT OR REPLACE` ensures no duplicate records
6. **Concurrent sync protection** — Only one sync per entity runs at a time
7. **Data consistency** — Partial failed syncs preserve existing data; no data is deleted on failure

---

## Configuration

### Mock BSE API Delay

For development, the default delay is 2 seconds per page. To simulate the real 10-minute pull:

```bash
BSE_DELAY_MS=60000 node server.js
```

Or update at runtime:
```bash
curl -X PUT http://localhost:4000/api/config -H "Content-Type: application/json" -d '{"delayPerPageMs": 60000}'
```

---

## Scaling to 100× Data Volume

At 100× volume (~25,000 clients, ~500,000 trades):

1. **Database** — Migrate from SQLite to PostgreSQL for concurrent write support
2. **Sync** — Implement streaming/cursor-based pagination instead of page-based
3. **Backend** — Add connection pooling, batch upserts (1000 records per transaction)
4. **Frontend** — Implement virtual scrolling for large tables, server-side pagination (already in place)
5. **Caching** — Add Redis as a read cache layer between API and database
6. **Infrastructure** — Deploy backend as multiple workers behind a load balancer; use message queues (Bull/RabbitMQ) for sync jobs
