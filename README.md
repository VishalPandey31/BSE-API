# 🏦 Arham Fintech — Internal Operations Portal

> **Technical Assessment** · Stock Broking Internal Operations Portal with Mock BSE API Simulator

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/VishalPandey31/BSE-API)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![SQLite](https://img.shields.io/badge/SQLite-Cache-003B57?logo=sqlite&logoColor=white)](https://sql.js.org)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socket.io)](https://socket.io)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Part A — Mock BSE API](#-part-a--mock-bse-api)
- [Part B — Internal Portal](#-part-b--internal-portal)
- [Deployment](#-deployment)
- [Design Decisions](#-design-decisions)
- [Scaling to 100×](#-scaling-to-100-data-volume)

---

## 🎯 Overview

This project implements a **fully functional internal operations portal** for a stock broking firm with two major components:

| Component | Description | Stack |
|-----------|-------------|-------|
| **Part A** — Mock BSE API | Simulates a slow, unreliable BSE Exchange API | Node.js, Express |
| **Part B** — Internal Portal | Dashboard for clients, trades, employees, incentives | React, Express, SQLite, Socket.io |

### Key Highlights

- ⚡ **< 1 second page loads** — Cache-first architecture serves from SQLite, even when BSE is down
- 🔄 **Real-time updates** — Socket.io pushes live data without page refresh
- 🔁 **Smart retry** — Exponential backoff handles BSE's ~20% failure rate
- 📊 **5 role-based views** — Clients, Trades, My Clients, Employees, Incentives
- 🚫 **No cronjob** — Data sync is user-triggered, on-demand

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    React Frontend (:5173)                 │
│   Clients │ Trades │ My Clients │ Employees │ Incentives │
│          REST API ▼              WebSocket ▼              │
└──────────────────────────────────────────────────────────┘
                        │                │
┌───────────────────────▼────────────────▼─────────────────┐
│              Portal Backend (:3001)                       │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  REST Routes  │  │  Sync Service  │  │  Socket.io    │  │
│  │  (instant)    │  │  (background)  │  │  (push)       │  │
│  └──────┬───────┘  └──────┬────────┘  └───────────────┘  │
│         │                 │                               │
│         ▼                 ▼                               │
│  ┌─────────────┐  ┌─────────────────────────────────┐    │
│  │ SQLite Cache │  │ Mock BSE API (:4000)             │    │
│  │ (sub-ms read)│  │ Slow (2s-10min) + 20% failures  │    │
│  └─────────────┘  └─────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User opens page → Backend reads from **SQLite cache** instantly (< 50ms)
2. User clicks "Sync from BSE" → Backend fetches from BSE in **background**
3. Each page retried up to **5 times** with exponential backoff
4. New data upserted into SQLite → **Socket.io** pushes `data-updated` event
5. Frontend **auto-refreshes** without page reload

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ and **npm** v8+

### 1. Clone & Install

```bash
git clone https://github.com/VishalPandey31/BSE-API.git
cd BSE-API
```

### 2. Start Mock BSE API (Terminal 1)

```bash
cd mock-bse-api
npm install
npm run seed
npm start
# ✅ Running on http://localhost:4000
```

### 3. Start Portal Backend (Terminal 2)

```bash
cd portal-backend
npm install
npm start
# ✅ Running on http://localhost:3001
```

### 4. Start Portal Frontend (Terminal 3)

```bash
cd portal-frontend
npm install
npm run dev
# ✅ Running on http://localhost:5173
```

### 5. Use the Portal

1. Open **http://localhost:5173**
2. Select an employee profile → Login
3. Click **🔄 Sync from BSE** to pull data
4. Navigate through all 5 views

---

## 📁 Project Structure

```
BSE-API/
├── mock-bse-api/                  # Part A — Mock Exchange Simulator
│   ├── server.js                  # Express server (delay + failure simulation)
│   ├── seed.js                    # Data generator (250 clients, 5000 trades)
│   ├── package.json
│   └── data/                      # Generated seed JSON files
│
├── portal-backend/                # Part B — Backend
│   ├── server.js                  # Express + Socket.io server
│   ├── db.js                      # SQLite database (sql.js)
│   ├── services/
│   │   └── bseSync.js             # On-demand sync with retry logic
│   ├── routes/
│   │   ├── clients.js             # Client endpoints (search, filter, paginate)
│   │   ├── trades.js              # Trade endpoints (multi-filter)
│   │   ├── employees.js           # Employee + My Clients endpoints
│   │   ├── incentives.js          # Incentive calculation engine
│   │   └── sync.js                # Sync trigger + status
│   └── package.json
│
├── portal-frontend/               # Part B — Frontend
│   ├── src/
│   │   ├── App.jsx                # Main app (sidebar, routing, sync bar)
│   │   ├── api.js                 # API client (env-configurable)
│   │   ├── socket.js              # Socket.io client
│   │   ├── index.css              # Dark theme design system
│   │   └── pages/
│   │       ├── LoginPage.jsx      # Employee profile selector
│   │       ├── ClientsPage.jsx    # All clients + filters
│   │       ├── TradesPage.jsx     # All trades + multi-filter
│   │       ├── MyClientsPage.jsx  # Employee's mapped clients
│   │       ├── EmployeesPage.jsx  # Employee directory
│   │       └── IncentivesPage.jsx # Brokerage-based incentives
│   └── package.json
│
├── ARCHITECTURE.md                # Detailed architecture document
└── README.md                      # This file
```

---

## 🔌 Part A — Mock BSE API

Simulates the real BSE Exchange behavior:

| Endpoint | Behavior | Delay | Failure Rate |
|----------|----------|-------|--------------|
| `GET /api/clients?page=N` | Paginated client data | Configurable (default 2s) | ~20% |
| `GET /api/trades?page=N` | Filterable trade data | Configurable (default 2s) | ~20% |
| `GET /api/internal/employees` | All employees | Instant | 0% |
| `GET /api/internal/mappings` | Employee-client maps | Instant | 0% |
| `GET /api/config` | View current config | Instant | 0% |
| `PUT /api/config` | Update delay/failure at runtime | Instant | 0% |

### Configuration

```bash
# Environment Variables
BSE_DELAY_MS=2000         # Delay per page (ms). Set 60000 for 10-min simulation
BSE_FAILURE_RATE=0.2      # Failure probability (0-1)
BSE_PAGE_SIZE=50           # Records per page

# Runtime Update
curl -X PUT http://localhost:4000/api/config \
  -H "Content-Type: application/json" \
  -d '{"delayPerPageMs": 60000, "failureRate": 0.3}'
```

### Seed Data
| Entity | Count | Notes |
|--------|-------|-------|
| Clients | ~250 | Indian names, cities, PAN, segments |
| Trades | ~5000 | NSE/BSE, multiple symbols, 6-month range |
| Employees | 20 | RM roles, departments |
| Mappings | ~250 | Each client → 1 employee |

---

## 🖥 Part B — Internal Portal

### Views

| # | View | Description | Access |
|---|------|-------------|--------|
| 1 | **Clients** | All clients with search, status/city/segment filters, pagination | All |
| 2 | **Trades** | All trades, filter by client/date-range/symbol/type | All |
| 3 | **My Clients** | Only logged-in employee's mapped clients | Employee |
| 4 | **Employees** | Employee directory with client counts, department filter | All |
| 5 | **Incentives** | Brokerage-based incentive dashboard | Employee: own / Management: all |

### Incentive Formula

```
For each employee:
  → Find mapped clients (via employee-client mappings)
  → Sum brokerage from all EXECUTED trades of those clients
  → Incentive = totalBrokerage × 10%
```

### Backend API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients?search=&status=&city=&page=` | Paginated clients |
| GET | `/api/clients/cities` | Distinct cities list |
| GET | `/api/trades?clientId=&from=&to=&symbol=&tradeType=` | Filtered trades |
| GET | `/api/trades/symbols` | Distinct symbols list |
| GET | `/api/employees?search=&department=` | Employee directory |
| GET | `/api/employees/my-clients?employeeId=` | Mapped clients |
| GET | `/api/employees/departments` | Department list |
| GET | `/api/incentives?role=&employeeId=` | Incentive data |
| POST | `/api/sync/trigger` | Trigger BSE sync `{"entity":"all"}` |
| GET | `/api/sync/status` | Sync progress |
| GET | `/api/auth/employees` | Employee list for login |
| GET | `/api/dashboard/stats` | Dashboard summary |

---

## 🌐 Deployment

### Frontend → Vercel

| Setting | Value |
|---------|-------|
| Framework | Vite |
| Root Directory | `portal-frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env: `VITE_API_URL` | `https://your-portal-backend.onrender.com/api` |
| Env: `VITE_WS_URL` | `https://your-portal-backend.onrender.com` |

### Backend → Render (2 Web Services)

**Service 1: Mock BSE API**

| Setting | Value |
|---------|-------|
| Name | `mock-bse-api` |
| Root Directory | `mock-bse-api` |
| Build Command | `npm install && npm run seed` |
| Start Command | `node server.js` |

**Service 2: Portal Backend**

| Setting | Value |
|---------|-------|
| Name | `portal-backend` |
| Root Directory | `portal-backend` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Env: `BSE_API_URL` | `https://your-mock-bse-api.onrender.com` |
| Env: `FRONTEND_URL` | `https://your-frontend.vercel.app` |

---

## 💡 Design Decisions

| Decision | Reasoning |
|----------|-----------|
| **On-demand sync** (no cronjob) | Assessment requirement; prevents unnecessary BSE load |
| **Cache-first** (SQLite) | Ensures < 1s page loads even when BSE is down |
| **Socket.io** for realtime | Pushes `data-updated` events — no polling, no refresh |
| **Exponential backoff** (5 retries) | Handles BSE's 20% failure rate gracefully |
| **`INSERT OR REPLACE`** | Idempotent upserts — no duplicates on re-sync |
| **Concurrent sync guard** | Boolean lock prevents overlapping syncs |
| **sql.js** (pure JS SQLite) | Zero native dependencies — works everywhere |
| **Role-based views** | Employee sees own data; Management sees everything |

---

## 📈 Scaling to 100× Data Volume

At 25,000 clients and 500,000 trades:

| Layer | Current | At Scale |
|-------|---------|----------|
| Database | SQLite (file-based) | PostgreSQL + connection pooling |
| Sync | Sequential page fetch | Parallel fetches + batch upserts |
| API Server | Single Node.js process | Clustered workers + load balancer |
| Read Cache | SQLite reads | Redis cache layer |
| Frontend | Client pagination | Virtual scrolling (react-window) |
| WebSocket | Single-server Socket.io | Redis adapter for multi-server |
| Queue | In-process | Bull/RabbitMQ for job management |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Vanilla CSS (Dark Theme) |
| Backend | Node.js, Express |
| Database | SQLite via sql.js (pure JavaScript) |
| Real-time | Socket.io |
| Mock API | Express with configurable delay/failure |

---

<div align="center">

**Built for Arham Fintech Private Limited** · Technical Assessment

</div>
