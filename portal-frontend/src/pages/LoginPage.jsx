import { useState, useEffect } from 'react';
import { api } from '../api';

export default function LoginPage({ onLogin }) {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEmployees = () => {
    setLoading(true);
    setError(null);
    api.getAuthEmployees()
      .then(res => {
        setEmployees(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load employees:', err);
        setError('Could not connect to server. It may be waking up — please retry in a few seconds.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleLogin = () => {
    if (selected) onLogin(selected);
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Connecting to portal...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Arham Fintech</h1>
        <p className="subtitle">Internal Operations Portal</p>

        <label className="login-label">Select your profile to continue</label>

        {error && (
          <div className="error-state" style={{ padding: '1rem', background: 'rgba(255,80,80,0.1)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#ff6b6b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{error}</p>
            <button className="login-btn" onClick={loadEmployees} style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>🔄 Retry</button>
          </div>
        )}

        {!error && employees.length === 0 && !loading && (
          <div className="error-state" style={{ padding: '1rem', background: 'rgba(139,92,246,0.1)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#a78bfa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Server is waking up... profiles loading shortly.</p>
            <button className="login-btn" onClick={loadEmployees} style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}>🔄 Retry</button>
          </div>
        )}

        <div className="employee-list">
          {employees.map(emp => (
            <div
              key={emp.employeeId}
              className={`employee-option ${selected?.employeeId === emp.employeeId ? 'selected' : ''}`}
              onClick={() => setSelected(emp)}
            >
              <div className="emp-avatar">
                {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="emp-info">
                <div className="emp-name">{emp.name}</div>
                <div className="emp-role">{emp.designation} · {emp.department}</div>
              </div>
              <span className={`badge ${emp.role.toLowerCase()}`}>
                {emp.role}
              </span>
            </div>
          ))}
        </div>

        <button
          className="login-btn"
          disabled={!selected}
          onClick={handleLogin}
        >
          {selected ? `Continue as ${selected.name.split(' ')[0]}` : 'Select a profile'}
        </button>
      </div>
    </div>
  );
}
