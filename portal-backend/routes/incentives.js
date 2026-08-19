const express = require('express');
const { queryAll } = require('../db');

const router = express.Router();

// GET /api/incentives
router.get('/', (req, res) => {
  const { employeeId, role } = req.query;
  const INCENTIVE_PERCENTAGE = 10;

  let employeeFilter = '';
  let params = [];

  if (role !== 'MANAGEMENT' && employeeId) {
    employeeFilter = 'WHERE e.employeeId = ?';
    params = [employeeId];
  }

  const data = queryAll(`
    SELECT
      e.employeeId,
      e.name as employeeName,
      e.designation,
      e.department,
      e.role,
      COUNT(DISTINCT m.clientId) as totalClients,
      COUNT(DISTINCT t.tradeId) as totalTrades,
      COALESCE(SUM(t.brokerage), 0) as totalBrokerage,
      ROUND(COALESCE(SUM(t.brokerage), 0) * ${INCENTIVE_PERCENTAGE} / 100, 2) as incentiveAmount,
      COALESCE(SUM(t.totalValue), 0) as totalTradeValue,
      ${INCENTIVE_PERCENTAGE} as incentivePercentage
    FROM employees e
    LEFT JOIN mappings m ON e.employeeId = m.employeeId
    LEFT JOIN trades t ON m.clientId = t.clientId AND t.status = 'EXECUTED'
    ${employeeFilter}
    GROUP BY e.employeeId
    ORDER BY incentiveAmount DESC
  `, params);

  const summary = {
    totalIncentives: data.reduce((sum, d) => sum + (d.incentiveAmount || 0), 0),
    totalBrokerage: data.reduce((sum, d) => sum + (d.totalBrokerage || 0), 0),
    totalTrades: data.reduce((sum, d) => sum + (d.totalTrades || 0), 0),
    employeeCount: data.length,
    incentivePercentage: INCENTIVE_PERCENTAGE
  };

  res.json({ data, summary });
});

module.exports = router;
