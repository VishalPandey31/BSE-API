const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { initDb, queryAll, queryOne } = require('./db');
const { syncInternal } = require('./services/bseSync');
const clientsRouter = require('./routes/clients');
const tradesRouter = require('./routes/trades');
const employeesRouter = require('./routes/employees');
const incentivesRouter = require('./routes/incentives');
const { syncRouter, setIo } = require('./routes/sync');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    'https://portal-frontend-neon-three.vercel.app',
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173'
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT']
    }
});

setIo(io);

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT']
}));
app.use(express.json());

// Request logging (only slow requests)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 100) {
            console.log(`${req.method} ${req.originalUrl} — ${res.statusCode} (${duration}ms)`);
        }
    });
    next();
});

// Routes
app.use('/api/clients', clientsRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/incentives', incentivesRouter);
app.use('/api/sync', syncRouter);

// Auth simulation — get employee list for login (auto-syncs if empty)
app.get('/api/auth/employees', async (req, res) => {
    let employees = queryAll('SELECT employeeId, name, role, designation, department FROM employees ORDER BY name');
    if (employees.length === 0) {
        console.log('[AUTH] No employees found, triggering sync...');
        try {
            await syncInternal();
            employees = queryAll('SELECT employeeId, name, role, designation, department FROM employees ORDER BY name');
            console.log(`[AUTH] Sync complete, found ${employees.length} employees.`);
        } catch (err) {
            console.error('[AUTH] Auto-sync failed:', err.message);
        }
    }
    res.json({ data: employees });
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
    const clientCount = queryOne('SELECT COUNT(*) as count FROM clients')?.count || 0;
    const tradeCount = queryOne('SELECT COUNT(*) as count FROM trades')?.count || 0;
    const employeeCount = queryOne('SELECT COUNT(*) as count FROM employees')?.count || 0;
    const activeClients = queryOne("SELECT COUNT(*) as count FROM clients WHERE status = 'ACTIVE'")?.count || 0;
    const totalBrokerage = queryOne("SELECT COALESCE(SUM(brokerage), 0) as total FROM trades WHERE status = 'EXECUTED'")?.total || 0;
    const totalTradeValue = queryOne("SELECT COALESCE(SUM(totalValue), 0) as total FROM trades WHERE status = 'EXECUTED'")?.total || 0;

    res.json({
        clientCount, activeClients, tradeCount, employeeCount,
        totalBrokerage: Math.round(totalBrokerage * 100) / 100,
        totalTradeValue: Math.round(totalTradeValue * 100) / 100
    });
});

// Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Internal Portal Backend', uptime: process.uptime() });
});

// WebSocket
io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 3001;

async function start() {
    await initDb();
    console.log('Database initialized.');

    // Retry sync up to 3 times with increasing delay (handles Render cold starts)
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await syncInternal();
            console.log('Internal data synced on startup.');
            break;
        } catch (err) {
            console.warn(`Sync attempt ${attempt}/3 failed: ${err.message}`);
            if (attempt < 3) {
                const delay = attempt * 10000;
                console.log(`  Retrying in ${delay / 1000}s...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    server.listen(PORT, () => {
        console.log(`\n🖥️  Internal Portal Backend running on http://localhost:${PORT}`);
        console.log(`   WebSocket ready for real-time updates\n`);
    });
}

start();
