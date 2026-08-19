import { useState, useEffect } from 'react';
import { api } from '../api';

export default function LoginPage({ onLogin }) {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAuthEmployees()
      .then(res => {
        setEmployees(res.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load employees:', err);
        setLoading(false);
      });
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
