const express = require('express');
const { queryAll, queryOne } = require('../db');

const router = express.Router();

// GET /api/trades
router.get('/', (req, res) => {
    const { clientId, from, to, symbol, tradeType, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    if (clientId) { where.push(`t.clientId = ?`); params.push(clientId); }
    if (from) { where.push(`t.tradeDate >= ?`); params.push(from); }
    if (to) { where.push(`t.tradeDate <= ?`); params.push(to); }
    if (symbol) { where.push(`t.symbol = ?`); params.push(symbol); }
    if (tradeType) { where.push(`t.tradeType = ?`); params.push(tradeType); }
    if (search) {
        where.push(`(t.tradeId LIKE ? OR t.symbol LIKE ? OR c.name LIKE ?)`);
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const total = queryOne(`SELECT COUNT(*) as count FROM trades t LEFT JOIN clients c ON t.clientId = c.clientId ${whereClause}`, params)?.count || 0;
    const data = queryAll(`
    SELECT t.*, c.name as clientName FROM trades t
    LEFT JOIN clients c ON t.clientId = c.clientId
    ${whereClause}
    ORDER BY t.tradeDate DESC, t.tradeTime DESC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

    res.json({
        data,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
});

// GET /api/trades/symbols
router.get('/symbols', (req, res) => {
    const symbols = queryAll('SELECT DISTINCT symbol FROM trades WHERE symbol IS NOT NULL ORDER BY symbol');
    res.json(symbols.map(s => s.symbol));
});

module.exports = router;
