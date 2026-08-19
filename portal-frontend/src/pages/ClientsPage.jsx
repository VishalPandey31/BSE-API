import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import socket from '../socket';

export default function ClientsPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', city: '', segment: '', page: 1 });
  const [cities, setCities] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.city) params.city = filters.city;
      if (filters.segment) params.segment = filters.segment;
      params.page = filters.page;
      params.limit = 30;

      const res = await api.getClients(params);
      setData(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    api.getCities().then(setCities).catch(() => {});
  }, []);

  // Real-time updates via WebSocket
  useEffect(() => {
    const handler = (msg) => {
      if (msg.entity === 'clients') {
        fetchData();
      }
    };
    socket.on('data-updated', handler);
    return () => socket.off('data-updated', handler);
  }, [fetchData]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    setLoading(true);
  };

  const clearFilters = () => {
    setFilters({ search: '', status: '', city: '', segment: '', page: 1 });
    setLoading(true);
  };

  const setPage = (p) => {
    setFilters(prev => ({ ...prev, page: p }));
    setLoading(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Clients</h2>
          <p>All registered clients with key details</p>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          <span className="realtime-dot"></span>Real-time
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Search</label>
          <input
            className="filter-input"
            placeholder="Name, ID, PAN, Email..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select className="filter-select" value={filters.status} onChange={e => updateFilter('status', e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div className="filter-group">
          <label>City</label>
          <select className="filter-select" value={filters.city} onChange={e => updateFilter('city', e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Segment</label>
          <select className="filter-select" value={filters.segment} onChange={e => updateFilter('segment', e.target.value)}>
            <option value="">All</option>
            <option value="EQUITY">Equity</option>
            <option value="F&O">F&O</option>
            <option value="COMMODITY">Commodity</option>
            <option value="CURRENCY">Currency</option>
          </select>
        </div>
        <button className="clear-filters-btn" onClick={clearFilters}>Clear</button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading clients...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No clients found. Try adjusting your filters or sync data from BSE.</p>
          </div>
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
                    <th>Join Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(client => (
                    <tr key={client.clientId}>
                      <td className="primary">{client.clientId}</td>
                      <td className="primary">{client.name}</td>
                      <td>{client.pan}</td>
                      <td>{client.email}</td>
                      <td>{client.phone}</td>
                      <td>{client.city}</td>
                      <td><span className="badge employee">{client.segment}</span></td>
                      <td>
                        <span className={`badge ${client.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                          {client.status}
                        </span>
                      </td>
                      <td>{client.joinDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span className="page-info">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} clients
              </span>
              <div className="page-controls">
                <button className="page-btn" disabled={pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>← Prev</button>
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const start = Math.max(1, pagination.page - 2);
                  const pageNum = start + i;
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <button key={pageNum} className={`page-btn ${pageNum === pagination.page ? 'active' : ''}`}
                      onClick={() => setPage(pageNum)}>{pageNum}</button>
                  );
                })}
                <button className="page-btn" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
