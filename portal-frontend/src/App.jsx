import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import socket from './socket';
import { api } from './api';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';
import TradesPage from './pages/TradesPage';
import MyClientsPage from './pages/MyClientsPage';
import EmployeesPage from './pages/EmployeesPage';
import IncentivesPage from './pages/IncentivesPage';
import './index.css';

function SyncBar() {
  const [syncState, setSyncState] = useState({});
  const [progress, setProgress] = useState({});
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Listen for sync status updates
    socket.on('sync-status', (msg) => {
      setSyncState(prev => ({ ...prev, [msg.entity]: msg.status }));
      if (msg.status === 'complete' || msg.status === 'error') {
        setTimeout(() => {
          setSyncState(prev => ({ ...prev, [msg.entity]: 'idle' }));
          setSyncing(false);
        }, 2000);
      }
    });

    socket.on('sync-progress', (msg) => {
      setProgress(prev => ({ ...prev, [msg.entity]: msg }));
    });

    return () => {
      socket.off('sync-status');
      socket.off('sync-progress');
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.triggerSync('all');
    } catch (err) {
      console.error('Sync trigger failed:', err);
      setSyncing(false);
    }
  };

  const isSyncing = syncing || Object.values(syncState).some(s => s === 'syncing');
  const hasError = Object.values(syncState).some(s => s === 'error');
  const indicatorClass = isSyncing ? 'syncing' : hasError ? 'error' : '';

  const progressText = isSyncing
    ? Object.entries(progress)
        .filter(([, p]) => p.pagesFetched < p.totalPages)
        .map(([entity, p]) => `${entity}: ${p.pagesFetched}/${p.totalPages} pages`)
        .join(' · ') || 'Starting sync...'
    : hasError
    ? 'Sync encountered errors. Data may be partial.'
    : 'Data is up to date from cache.';

  return (
    <div className="sync-bar">
      <div className={`sync-indicator ${indicatorClass}`}></div>
      <span className="sync-text">{progressText}</span>
      <button className="sync-btn" onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : '🔄 Sync from BSE'}
      </button>
    </div>
  );
}

function Sidebar({ user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>Arham Fintech</h1>
        <p>Internal Operations</p>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/clients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="icon">👥</span><span>Clients</span>
        </NavLink>
        <NavLink to="/trades" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="icon">📈</span><span>Trades</span>
        </NavLink>
        <NavLink to="/my-clients" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🤝</span><span>My Clients</span>
        </NavLink>
        <NavLink to="/employees" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="icon">🏢</span><span>Employees</span>
        </NavLink>
        <NavLink to="/incentives" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <span className="icon">💰</span><span>Incentives</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <div className="user-details">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>Sign Out</button>
      </div>
    </aside>
  );
}

function AppContent({ user, onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <main className="main-content">
        <SyncBar />
        <Routes>
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/trades" element={<TradesPage />} />
          <Route path="/my-clients" element={<MyClientsPage user={user} />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/incentives" element={<IncentivesPage user={user} />} />
          <Route path="*" element={<Navigate to="/clients" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('portal_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (employee) => {
    setUser(employee);
    localStorage.setItem('portal_user', JSON.stringify(employee));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('portal_user');
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <AppContent user={user} onLogout={handleLogout} />
    </BrowserRouter>
  );
}
