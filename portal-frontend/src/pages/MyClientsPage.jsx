import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import socket from '../socket';

export default function MyClientsPage({ user }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPageNum] = useState(1);

  const fetchData = useCallback(async () => {
    if (!user?.employeeId) return;
    try {
      const params = { employeeId: user.employeeId, page, limit: 30 };
      if (search) params.search = search;
      const res = await api.getMyClients(params);
      setData(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error('Error fetching my clients:', err);
    } finally {
      setLoading(false);
    }
  }, [user, search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (msg) => { if (msg.entity === 'clients') fetchData(); };
    socket.on('data-updated', handler);
    return () => socket.off('data-updated', handler);
  }, [fetchData]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Clients</h2>
          <p>Clients mapped to you — {user?.name}</p>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          <span className="realtime-dot"></span>Real-time
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Search</label>
          <input className="filter-input" placeholder="Name, ID, PAN..."
            value={search} onChange={e => { setSearch(e.target.value); setPageNum(1); setLoading(true); }} />
        </div>
        {search && <button className="clear-filters-btn" onClick={() => { setSearch(''); setPageNum(1); setLoading(true); }}>Clear</button>}
      </div>

      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-label">Mapped Clients</div>
          <div className="stat-value accent">{pagination.total || 0}</div>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading your clients...</p></div>
        ) : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">👥</div><p>No clients mapped to you yet.</p></div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Client ID</th>
                    <th>Name</th>
                    <th>PAN</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Segment</th>
                    <th>Status</th>
                    <th>Mapped Since</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(c => (
                    <tr key={c.clientId}>
                      <td className="primary">{c.clientId}</td>
                      <td className="primary">{c.name}</td>
                      <td>{c.pan}</td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                      <td>{c.city}</td>
                      <td><span className="badge employee">{c.segment}</span></td>
                      <td><span className={`badge ${c.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{c.status}</span></td>
                      <td>{c.mappedSince}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span className="page-info">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="page-controls">
                <button className="page-btn" disabled={pagination.page <= 1} onClick={() => { setPageNum(page - 1); setLoading(true); }}>← Prev</button>
                <button className="page-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => { setPageNum(page + 1); setLoading(true); }}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
