import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import socket from '../socket';

function formatMoney(val) {
  if (!val && val !== 0) return '—';
  return '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TradesPage() {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '', clientId: '', from: '', to: '', symbol: '', tradeType: '', page: 1
  });
  const [symbols, setSymbols] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      params.limit = 30;

      const res = await api.getTrades(params);
      setData(res.data || []);
      setPagination(res.pagination || {});
    } catch (err) {
      console.error('Error fetching trades:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.getSymbols().then(setSymbols).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (msg) => { if (msg.entity === 'trades') fetchData(); };
    socket.on('data-updated', handler);
    return () => socket.off('data-updated', handler);
  }, [fetchData]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    setLoading(true);
  };

  const clearFilters = () => {
    setFilters({ search: '', clientId: '', from: '', to: '', symbol: '', tradeType: '', page: 1 });
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
          <h2>Trades</h2>
          <p>All trade records — filterable by client and date range</p>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          <span className="realtime-dot"></span>Real-time
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Search</label>
          <input className="filter-input" placeholder="Trade ID, Symbol, Client..."
            value={filters.search} onChange={e => updateFilter('search', e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Client ID</label>
          <input className="filter-input" placeholder="e.g. BSE000001"
            value={filters.clientId} onChange={e => updateFilter('clientId', e.target.value)} style={{ minWidth: '130px' }} />
        </div>
        <div className="filter-group">
          <label>From Date</label>
          <input className="filter-input" type="date" value={filters.from}
            onChange={e => updateFilter('from', e.target.value)} />
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <input className="filter-input" type="date" value={filters.to}
            onChange={e => updateFilter('to', e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Symbol</label>
          <select className="filter-select" value={filters.symbol} onChange={e => updateFilter('symbol', e.target.value)}>
            <option value="">All</option>
            {symbols.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Type</label>
          <select className="filter-select" value={filters.tradeType} onChange={e => updateFilter('tradeType', e.target.value)} style={{ minWidth: '100px' }}>
            <option value="">All</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
        <button className="clear-filters-btn" onClick={clearFilters}>Clear</button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading trades...</p></div>
        ) : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📊</div><p>No trades found. Adjust filters or sync from BSE.</p></div>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Trade ID</th>
                    <th>Client</th>
                    <th>Symbol</th>
                    <th>Exchange</th>
                    <th>Type</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total Value</th>
                    <th>Brokerage</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(t => (
                    <tr key={t.tradeId}>
                      <td className="primary">{t.tradeId}</td>
                      <td className="primary">{t.clientName || t.clientId}</td>
                      <td className="primary">{t.symbol}</td>
                      <td>{t.exchange}</td>
                      <td><span className={`badge ${t.tradeType.toLowerCase()}`}>{t.tradeType}</span></td>
                      <td className="money">{t.quantity.toLocaleString()}</td>
                      <td className="money">{formatMoney(t.price)}</td>
                      <td className="money">{formatMoney(t.totalValue)}</td>
                      <td className="money positive">{formatMoney(t.brokerage)}</td>
                      <td>{t.tradeDate}</td>
                      <td>{t.tradeTime}</td>
                      <td><span className={`badge ${t.status.toLowerCase()}`}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span className="page-info">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} trades
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
