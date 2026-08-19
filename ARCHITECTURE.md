# Architecture Document — Arham Fintech Internal Operations Portal

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                     │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  React Frontend (Vite, :5173)                                       │   │
│   │  ┌──────────┬──────────┬───────────┬───────────┬───────────────┐    │   │
│   │  │ Clients  │ Trades   │ My Clients│ Employees │  Incentives   │    │   │
│   │  └──────────┴──────────┴───────────┴───────────┴───────────────┘    │   │
│   │         │ REST API (fetch)              │ WebSocket (Socket.io)      │   │
│   └─────────┼──────────────────────────────┼────────────────────────────┘   │
└─────────────┼──────────────────────────────┼────────────────────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Portal Backend (Express + Socket.io, :3001)                                │
│                                                                             │
│  ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────────┐   │
│  │   REST API Routes  │  │  BSE Sync Service   │  │ WebSocket Server    │   │
│  │  /clients          │  │  • On-demand pull    │  │ • Emit data-updated │   │
│  │  /trades           │  │  • Retry + backoff   │  │ • Emit sync-progress│   │
│  │  /employees        │  │  • Deduplication     │  │ • Emit sync-status  │   │
│  │  /my-clients       │  │  • Page-by-page      │  └─────────────────────┘   │
│  │  /incentives       │  │  • Concurrent guard  │                            │
│  │  /sync/trigger     │  └─────────┬────────────┘                            │
│  └────────┬───────────┘            │                                         │
│           │                        │  HTTP (with retry)                      │
│           ▼                        ▼                                         │
│  ┌──────────────────┐   ┌──────────────────────────────────────────────┐    │
│  │  SQLite (sql.js)  │   │  Mock BSE API (Express, :4000)              │    │
│  │  • clients        │   │  • /api/clients     (slow, ~20% fail)       │    │
│  │  • trades         │   │  • /api/trades      (slow, ~20% fail)       │    │
│  │  • employees      │   │  • /api/internal/*  (instant, reliable)     │    │
│  │  • mappings       │   └──────────────────────────────────────────────┘    │
│  │  • sync_status    │                                                       │
│  └──────────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Design Decisions & Reasoning

### 1. On-Demand Pull (No Cronjob)

**Why:** The assessment explicitly prohibits cronjob/scheduler approaches. API calls are expensive.

**How:** Users click "Sync from BSE" to trigger a background pull. The sync runs asynchronously — the API returns immediately with a 202-style response, while the actual data fetching happens in the background. Socket.io pushes progress updates to all connected clients in real-time.

### 2. Cache-First Architecture

**Why:** Hard requirement — every screen must load in under 1 second, even if BSE is down.

**How:** All data served from local SQLite cache. When the user opens a page, the backend queries SQLite (sub-millisecond reads) and returns instantly. Fresh data is only pulled on explicit user request, and arrives asynchronously via WebSocket.

**Flow:**
```
User opens page → Frontend calls REST API → Backend reads from SQLite → Response in <50ms
                                                    ↑
User clicks "Sync" → Backend fetches from BSE (background) → Upserts into SQLite
                                                              → Socket.io emits "data-updated"
                                                              → Frontend auto-refreshes table
```

### 3. Page-by-Page Fetching with 30s Timeout Handling

**Why:** BSE terminates requests after 30 seconds. A full pull takes 5-10 minutes.

**How:** The Mock BSE API paginates data (50 records/page). Each page request has its own delay and timeout budget. The sync service fetches one page at a time, retrying on failure with exponential backoff (1s, 2s, 4s, 8s, 16s).

### 4. Retry + Exponential Backoff

**Why:** ~20% of BSE pulls fail mid-pull.

**How:** Each page fetch gets up to 5 retry attempts with exponential backoff. If all retries fail, the sync marks as "error" but preserves all previously synced data (no rollback of successful pages).

### 5. Deduplication via Upsert

**Why:** Re-syncing must not create duplicates or corrupt data.

**How:** `INSERT OR REPLACE` on primary keys (clientId, tradeId, etc.) ensures idempotent ingestion. Running sync multiple times produces the same clean dataset.

### 6. Concurrent Sync Guard

**Why:** Multiple users might click "Sync" simultaneously.

**How:** A boolean flag per entity (`syncInProgress.clients`, `syncInProgress.trades`) prevents overlapping syncs. If a sync is already running, new requests are silently skipped.

### 7. WebSocket for Real-Time Updates

**Why:** Hard requirement — open screens must update without page refresh.

**How:** Socket.io emits three event types:
- `sync-status` — syncing/complete/error state changes
- `sync-progress` — page-by-page progress (X/Y pages fetched)
- `data-updated` — signals frontend to re-fetch data from cache

Frontend components subscribe to these events and automatically refresh their data.

### 8. SQLite (sql.js) for Simplicity

**Why:** Zero external dependencies, embedded, works everywhere.

**Trade-off:** Limited concurrent write throughput. Acceptable at current scale (<10k records). For 100× volume, would migrate to PostgreSQL.

## Incentive Calculation

```
For each employee:
  1. Find mapped clients via employee→client mappings
  2. Sum brokerage from all EXECUTED trades of those clients
  3. Incentive = totalBrokerage × 10% (configurable)
```

## Scaling to 100× (25,000 Clients, 500,000 Trades)

| Component | Current | At 100× |
|-----------|---------|---------|
| Database | SQLite (file-based) | PostgreSQL with connection pooling |
| Sync | Sequential page fetch | Parallel page fetches, batch upserts (1000/transaction) |
| API | Single Node.js process | Multiple workers behind load balancer |
| Cache | SQLite reads | Redis read cache + PostgreSQL for writes |
| Frontend | Client-side pagination | Virtual scrolling (react-window), server-side aggregation |
| Real-time | Socket.io (single server) | Socket.io with Redis adapter for multi-server |
