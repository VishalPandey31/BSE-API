import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import socket from '../socket';

function formatMoney(val) {
  if (!val && val !== 0) return '₹0.00';
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function IncentivesPage({ user }) {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const isManagement = user?.role === 'MANAGEMENT';

  const fetchData = useCallback(async () => {
    try {
      const params = { employeeId: user.employeeId, role: user.role };
      const res = await api.getIncentives(params);
      setData(res.data || []);
      setSummary(res.summary || {});
    } catch (err) {
      console.error('Error fetching incentives:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (msg) => { if (msg.entity === 'trades' || msg.entity === 'clients') fetchData(); };
    socket.on('data-updated', handler);
    return () => socket.off('data-updated', handler);
  }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Incentives</h2>
          <p>{isManagement ? 'All employee incentives (Management view)' : 'Your incentive breakdown'}</p>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          <span className="realtime-dot"></span>Real-time
        </div>
      </div>

      <div className="stats-grid">
        {isManagement && (
          <div className="stat-card">
            <div className="stat-label">Total Incentives Paid</div>
            <div className="stat-value green">{formatMoney(summary.totalIncentives)}</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">{isManagement ? 'Total Brokerage' : 'Your Brokerage'}</div>
          <div className="stat-value blue">{formatMoney(isManagement ? summary.totalBrokerage : data[0]?.totalBrokerage)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{isManagement ? 'Total Trades' : 'Your Trades'}</div>
          <div className="stat-value accent">{isManagement ? summary.totalTrades?.toLocaleString() : data[0]?.totalTrades?.toLocaleString() || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Incentive Rate</div>
          <div className="stat-value yellow">{summary.incentivePercentage || data[0]?.incentivePercentage || 10}%</div>
        </div>
        {!isManagement && data[0] && (
          <div className="stat-card">
            <div className="stat-label">Your Incentive</div>
            <div className="stat-value green">{formatMoney(data[0]?.incentiveAmount)}</div>
          </div>
        )}
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><p>Calculating incentives...</p></div>
        ) : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">💰</div><p>No incentive data available.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Clients</th>
                  <th>Trades</th>
                  <th>Total Brokerage</th>
                  <th>Trade Value</th>
                  <th>Incentive ({summary.incentivePercentage || 10}%)</th>
                </tr>
              </thead>
              <tbody>
                {data.map(e => (
                  <tr key={e.employeeId}>
                    <td className="primary">{e.employeeId}</td>
                    <td className="primary">{e.employeeName}</td>
                    <td>{e.designation}</td>
                    <td>{e.department}</td>
                    <td className="primary">{e.totalClients}</td>
                    <td>{e.totalTrades.toLocaleString()}</td>
                    <td className="money">{formatMoney(e.totalBrokerage)}</td>
                    <td className="money">{formatMoney(e.totalTradeValue)}</td>
                    <td className="money positive" style={{ fontWeight: 700 }}>{formatMoney(e.incentiveAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
