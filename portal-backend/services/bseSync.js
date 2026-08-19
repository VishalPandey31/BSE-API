const http = require('http');
const https = require('https');
const { getDb, queryAll, queryOne, runSql, saveDb } = require('../db');

const BSE_BASE_URL = process.env.BSE_API_URL || 'https://bse-api-njul.onrender.com';

let syncInProgress = { clients: false, trades: false };

function fetchWithTimeout(url, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        const req = client.get(urlObj, { timeout: timeoutMs }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                } else {
                    try { resolve(JSON.parse(data)); }
                    catch (e) { reject(new Error(`Invalid JSON: ${data.substring(0, 200)}`)); }
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    });
}

async function fetchWithRetry(url, maxRetries = 5) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fetchWithTimeout(url);
        } catch (err) {
            lastError = err;
            const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 16000);
            console.log(`  [Retry ${attempt}/${maxRetries}] ${url} failed: ${err.message}. Retrying in ${backoffMs}ms...`);
            await new Promise(r => setTimeout(r, backoffMs));
        }
    }
    throw lastError;
}

function updateSyncStatus(entity, updates) {
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    runSql(`UPDATE sync_status SET ${fields}, updatedAt = datetime('now') WHERE entity = ?`, [...values, entity]);
}

function getSyncStatus() {
    return queryAll('SELECT * FROM sync_status');
}

async function syncClients(io) {
    if (syncInProgress.clients) {
        console.log('[SYNC] Client sync already in progress, skipping.');
        return { status: 'already_running' };
    }

    syncInProgress.clients = true;
    const db = getDb();

    try {
        updateSyncStatus('clients', { status: 'syncing', pagesFetched: 0, totalPages: 0, error: null });
        if (io) io.emit('sync-status', { entity: 'clients', status: 'syncing' });

        let page = 1;
        let hasMore = true;
        let totalFetched = 0;

        while (hasMore) {
            const url = `${BSE_BASE_URL}/api/clients?page=${page}`;
            console.log(`[SYNC] Fetching clients page ${page}...`);

            const result = await fetchWithRetry(url);

            // Upsert records
            for (const c of result.data) {
                runSql(`
          INSERT OR REPLACE INTO clients (clientId, name, pan, email, phone, city, segment, status, joinDate, dematAccountNo, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [c.clientId, c.name, c.pan, c.email, c.phone, c.city, c.segment, c.status, c.joinDate, c.dematAccountNo]);
            }

            totalFetched += result.data.length;
            hasMore = result.pagination.hasNextPage;

            updateSyncStatus('clients', { pagesFetched: page, totalPages: result.pagination.totalPages });

            if (io) {
                io.emit('sync-progress', { entity: 'clients', pagesFetched: page, totalPages: result.pagination.totalPages, recordsFetched: totalFetched });
                io.emit('data-updated', { entity: 'clients' });
            }

            page++;
        }

        updateSyncStatus('clients', { status: 'idle', lastSyncAt: new Date().toISOString(), lastSuccessAt: new Date().toISOString(), error: null });
        if (io) io.emit('sync-status', { entity: 'clients', status: 'complete' });

        console.log(`[SYNC] Client sync complete. ${totalFetched} records synced.`);
        return { status: 'complete', totalFetched };

    } catch (err) {
        console.error(`[SYNC] Client sync failed:`, err.message);
        updateSyncStatus('clients', { status: 'error', error: err.message });
        if (io) io.emit('sync-status', { entity: 'clients', status: 'error', error: err.message });
        return { status: 'error', error: err.message };
    } finally {
        syncInProgress.clients = false;
    }
}

async function syncTrades(io) {
    if (syncInProgress.trades) {
        console.log('[SYNC] Trade sync already in progress, skipping.');
        return { status: 'already_running' };
    }

    syncInProgress.trades = true;

    try {
        updateSyncStatus('trades', { status: 'syncing', pagesFetched: 0, totalPages: 0, error: null });
        if (io) io.emit('sync-status', { entity: 'trades', status: 'syncing' });

        let page = 1;
        let hasMore = true;
        let totalFetched = 0;

        while (hasMore) {
            const url = `${BSE_BASE_URL}/api/trades?page=${page}`;
            console.log(`[SYNC] Fetching trades page ${page}...`);

            const result = await fetchWithRetry(url);

            for (const t of result.data) {
                runSql(`
          INSERT OR REPLACE INTO trades (tradeId, clientId, symbol, exchange, segment, tradeType, quantity, price, totalValue, brokerage, tradeDate, tradeTime, settlementDate, status, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [t.tradeId, t.clientId, t.symbol, t.exchange, t.segment, t.tradeType, t.quantity, t.price, t.totalValue, t.brokerage, t.tradeDate, t.tradeTime, t.settlementDate, t.status]);
            }

            totalFetched += result.data.length;
            hasMore = result.pagination.hasNextPage;

            updateSyncStatus('trades', { pagesFetched: page, totalPages: result.pagination.totalPages });

            if (io) {
                io.emit('sync-progress', { entity: 'trades', pagesFetched: page, totalPages: result.pagination.totalPages, recordsFetched: totalFetched });
                io.emit('data-updated', { entity: 'trades' });
            }

            page++;
        }

        updateSyncStatus('trades', { status: 'idle', lastSyncAt: new Date().toISOString(), lastSuccessAt: new Date().toISOString(), error: null });
        if (io) io.emit('sync-status', { entity: 'trades', status: 'complete' });

        console.log(`[SYNC] Trade sync complete. ${totalFetched} records synced.`);
        return { status: 'complete', totalFetched };

    } catch (err) {
        console.error(`[SYNC] Trade sync failed:`, err.message);
        updateSyncStatus('trades', { status: 'error', error: err.message });
        if (io) io.emit('sync-status', { entity: 'trades', status: 'error', error: err.message });
        return { status: 'error', error: err.message };
    } finally {
        syncInProgress.trades = false;
    }
}

async function syncInternal() {
    try {
        const empResult = await fetchWithTimeout(`${BSE_BASE_URL}/api/internal/employees`);
        for (const e of empResult.data) {
            runSql(`
        INSERT OR REPLACE INTO employees (employeeId, name, email, designation, department, role, joiningDate, status, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [e.employeeId, e.name, e.email, e.designation, e.department, e.role, e.joiningDate, e.status]);
        }

        const mapResult = await fetchWithTimeout(`${BSE_BASE_URL}/api/internal/mappings`);
        for (const m of mapResult.data) {
            runSql(`
        INSERT OR REPLACE INTO mappings (mappingId, employeeId, clientId, assignedDate, updatedAt)
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [m.mappingId, m.employeeId, m.clientId, m.assignedDate]);
        }

        console.log(`[SYNC] Internal sync complete. ${empResult.data.length} employees, ${mapResult.data.length} mappings.`);
        return { employees: empResult.data.length, mappings: mapResult.data.length };
    } catch (err) {
        console.error('[SYNC] Internal sync failed:', err.message);
        throw err;
    }
}

module.exports = { syncClients, syncTrades, syncInternal, getSyncStatus };
