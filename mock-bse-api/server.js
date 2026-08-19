const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// --------------- Configuration ---------------
let config = {
    delayPerPageMs: parseInt(process.env.BSE_DELAY_MS || '2000'), // Default 2s for dev; set to 60000 for 10-min simulation
    failureRate: parseFloat(process.env.BSE_FAILURE_RATE || '0.2'), // 20% failure
    pageSize: parseInt(process.env.BSE_PAGE_SIZE || '50')
};

// --------------- Load Seed Data ---------------
const dataDir = path.join(__dirname, 'data');

function loadData(file) {
    const filePath = path.join(dataDir, file);
    if (!fs.existsSync(filePath)) {
        console.error(`Data file missing: ${filePath}. Run "npm run seed" first.`);
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

let clients = loadData('clients.json');
let trades = loadData('trades.json');
let employees = loadData('employees.json');
let mappings = loadData('mappings.json');

// --------------- Helpers ---------------
function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function shouldFail() {
    return Math.random() < config.failureRate;
}

// --------------- BSE Endpoints (slow + unreliable) ---------------

// GET /api/clients?page=1
app.get('/api/clients', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = config.pageSize;
    const totalPages = Math.ceil(clients.length / pageSize);

    // Simulate delay
    await simulateDelay(config.delayPerPageMs);

    // Simulate random failure (~20%)
    if (shouldFail()) {
        console.log(`[BSE] /api/clients page=${page} — FAILURE (simulated)`);
        return res.status(500).json({
            error: 'BSE_PULL_FAILURE',
            message: 'Connection to exchange interrupted. Please retry.',
            page,
            timestamp: new Date().toISOString()
        });
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = clients.slice(start, end);

    console.log(`[BSE] /api/clients page=${page}/${totalPages} — OK (${pageData.length} records)`);

    res.json({
        data: pageData,
        pagination: {
            page,
            pageSize,
            totalPages,
            totalRecords: clients.length,
            hasNextPage: page < totalPages
        },
        timestamp: new Date().toISOString()
    });
});

// GET /api/trades?page=1&clientId=X&from=YYYY-MM-DD&to=YYYY-MM-DD
app.get('/api/trades', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = config.pageSize;
    const { clientId, from, to } = req.query;

    // Filter trades
    let filtered = [...trades];
    if (clientId) {
        filtered = filtered.filter(t => t.clientId === clientId);
    }
    if (from) {
        filtered = filtered.filter(t => t.tradeDate >= from);
    }
    if (to) {
        filtered = filtered.filter(t => t.tradeDate <= to);
    }

    const totalPages = Math.ceil(filtered.length / pageSize);

    // Simulate delay
    await simulateDelay(config.delayPerPageMs);

    // Simulate random failure (~20%)
    if (shouldFail()) {
        console.log(`[BSE] /api/trades page=${page} — FAILURE (simulated)`);
        return res.status(500).json({
            error: 'BSE_PULL_FAILURE',
            message: 'Connection to exchange interrupted. Please retry.',
            page,
            timestamp: new Date().toISOString()
        });
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filtered.slice(start, end);

    console.log(`[BSE] /api/trades page=${page}/${totalPages} — OK (${pageData.length} records)`);

    res.json({
        data: pageData,
        pagination: {
            page,
            pageSize,
            totalPages,
            totalRecords: filtered.length,
            hasNextPage: page < totalPages
        },
        timestamp: new Date().toISOString()
    });
});

// --------------- Internal Endpoints (instant + reliable) ---------------

// GET /api/internal/employees — instant, no failure
app.get('/api/internal/employees', (req, res) => {
    console.log(`[INTERNAL] /api/internal/employees — OK (${employees.length} records)`);
    res.json({
        data: employees,
        totalRecords: employees.length,
        timestamp: new Date().toISOString()
    });
});

// GET /api/internal/mappings — instant, no failure
app.get('/api/internal/mappings', (req, res) => {
    console.log(`[INTERNAL] /api/internal/mappings — OK (${mappings.length} records)`);
    res.json({
        data: mappings,
        totalRecords: mappings.length,
        timestamp: new Date().toISOString()
    });
});

// --------------- Config Endpoints ---------------

// GET /api/config — view current config
app.get('/api/config', (req, res) => {
    res.json({
        delayPerPageMs: config.delayPerPageMs,
        failureRate: config.failureRate,
        pageSize: config.pageSize,
        estimatedFullPullTime: `${((config.delayPerPageMs * Math.ceil(clients.length / config.pageSize)) / 1000).toFixed(1)}s for clients, ${((config.delayPerPageMs * Math.ceil(trades.length / config.pageSize)) / 1000).toFixed(1)}s for trades`
    });
});

// PUT /api/config — update config at runtime
app.put('/api/config', (req, res) => {
    const { delayPerPageMs, failureRate, pageSize } = req.body;
    if (delayPerPageMs !== undefined) config.delayPerPageMs = parseInt(delayPerPageMs);
    if (failureRate !== undefined) config.failureRate = parseFloat(failureRate);
    if (pageSize !== undefined) config.pageSize = parseInt(pageSize);

    console.log(`[CONFIG] Updated:`, config);
    res.json({ message: 'Configuration updated', config });
});

// --------------- Health Check ---------------
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'Mock BSE Exchange API',
        uptime: process.uptime(),
        dataLoaded: {
            clients: clients.length,
            trades: trades.length,
            employees: employees.length,
            mappings: mappings.length
        },
        config
    });
});

// --------------- Start Server ---------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`\n🏦 Mock BSE Exchange API running on http://localhost:${PORT}`);
    console.log(`   Clients: ${clients.length} | Trades: ${trades.length}`);
    console.log(`   Employees: ${employees.length} | Mappings: ${mappings.length}`);
    console.log(`   Delay: ${config.delayPerPageMs}ms/page | Failure Rate: ${(config.failureRate * 100).toFixed(0)}%`);
    console.log(`   Page Size: ${config.pageSize}\n`);
});
