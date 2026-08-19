const express = require('express');
const { queryAll, queryOne } = require('../db');

const router = express.Router();

// GET /api/clients — all clients with search/pagination
router.get('/', (req, res) => {
    const { search, status, city, segment, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = [];
    let params = [];

    if (search) {
        where.push(`(name LIKE ? OR clientId LIKE ? OR pan LIKE ? OR email LIKE ?)`);
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }
    if (status) { where.push(`status = ?`); params.push(status); }
    if (city) { where.push(`city = ?`); params.push(city); }
    if (segment) { where.push(`segment = ?`); params.push(segment); }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const total = queryOne(`SELECT COUNT(*) as count FROM clients ${whereClause}`, params)?.count || 0;
    const data = queryAll(`SELECT * FROM clients ${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    res.json({
        data,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
});

// GET /api/clients/cities
router.get('/cities', (req, res) => {
    const cities = queryAll('SELECT DISTINCT city FROM clients WHERE city IS NOT NULL ORDER BY city');
    res.json(cities.map(c => c.city));
});

module.exports = router;
