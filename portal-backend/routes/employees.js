const express = require('express');
const { queryAll, queryOne } = require('../db');

const router = express.Router();

// GET /api/employees
router.get('/', (req, res) => {
    const { search, department, role } = req.query;

    let where = [];
    let params = [];

    if (search) {
        where.push(`(name LIKE ? OR employeeId LIKE ? OR email LIKE ?)`);
        const s = `%${search}%`;
        params.push(s, s, s);
    }
    if (department) { where.push(`department = ?`); params.push(department); }
    if (role) { where.push(`role = ?`); params.push(role); }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const data = queryAll(`
    SELECT e.*,
      (SELECT COUNT(*) FROM mappings m WHERE m.employeeId = e.employeeId) as clientCount
    FROM employees e
    ${whereClause}
    ORDER BY e.name ASC
  `, params);

    res.json({ data });
});

// GET /api/employees/my-clients
router.get('/my-clients', (req, res) => {
    const { employeeId, search, page = 1, limit = 50 } = req.query;

    if (!employeeId) {
        return res.status(400).json({ error: 'employeeId is required' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = ['m.employeeId = ?'];
    let params = [employeeId];

    if (search) {
        where.push(`(c.name LIKE ? OR c.clientId LIKE ? OR c.pan LIKE ?)`);
        const s = `%${search}%`;
        params.push(s, s, s);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const total = queryOne(`SELECT COUNT(*) as count FROM mappings m JOIN clients c ON m.clientId = c.clientId ${whereClause}`, params)?.count || 0;
    const data = queryAll(`
    SELECT c.*, m.assignedDate as mappedSince FROM mappings m
    JOIN clients c ON m.clientId = c.clientId
    ${whereClause}
    ORDER BY c.name ASC
    LIMIT ? OFFSET ?
  `, [...params, parseInt(limit), offset]);

    res.json({
        data,
        pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
});

// GET /api/employees/departments
router.get('/departments', (req, res) => {
    const departments = queryAll('SELECT DISTINCT department FROM employees WHERE department IS NOT NULL ORDER BY department');
    res.json(departments.map(d => d.department));
});

module.exports = router;
