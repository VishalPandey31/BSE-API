const express = require('express');
const { syncClients, syncTrades, syncInternal, getSyncStatus } = require('../services/bseSync');

const router = express.Router();

// Store io reference to pass to sync functions
let _io = null;
function setIo(io) { _io = io; }

// POST /api/sync/trigger — on-demand BSE sync (no cronjob!)
router.post('/trigger', async (req, res) => {
    const { entity } = req.body; // 'clients', 'trades', 'all', or 'internal'

    console.log(`[SYNC] Manual sync triggered for: ${entity || 'all'}`);

    // Return immediately, sync runs in background
    res.json({ message: `Sync triggered for ${entity || 'all'}`, timestamp: new Date().toISOString() });

    try {
        if (entity === 'internal' || entity === 'all' || !entity) {
            await syncInternal();
        }
        if (entity === 'clients' || entity === 'all' || !entity) {
            syncClients(_io); // Don't await — runs in background
        }
        if (entity === 'trades' || entity === 'all' || !entity) {
            syncTrades(_io); // Don't await — runs in background
        }
    } catch (err) {
        console.error('[SYNC] Trigger error:', err.message);
    }
});

// GET /api/sync/status — check current sync status
router.get('/status', (req, res) => {
    const statuses = getSyncStatus();
    res.json({ statuses });
});

module.exports = { syncRouter: router, setIo };
