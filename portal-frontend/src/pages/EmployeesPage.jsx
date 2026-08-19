import { useState, useEffect } from 'react';
import { api } from '../api';

export default function EmployeesPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (department) params.department = department;
    api.getEmployees(params)
      .then(res => { setData(res.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search, department]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Employees</h2>
          <p>All employees on the platform</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Search</label>
          <input className="filter-input" placeholder="Name, ID, Email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Department</label>
          <select className="filter-select" value={department} onChange={e => setDepartment(e.target.value)}>
            <option value="">All</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        {(search || department) && (
          <button className="clear-filters-btn" onClick={() => { setSearch(''); setDepartment(''); }}>Clear</button>
        )}
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading employees...</p></div>
        ) : data.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏢</div><p>No employees found.</p></div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Clients</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map(e => (
                  <tr key={e.employeeId}>
                    <td className="primary">{e.employeeId}</td>
                    <td className="primary">{e.name}</td>
                    <td>{e.email}</td>
                    <td>{e.designation}</td>
                    <td>{e.department}</td>
                    <td><span className={`badge ${e.role.toLowerCase()}`}>{e.role}</span></td>
                    <td className="primary">{e.clientCount}</td>
                    <td>{e.joiningDate}</td>
                    <td><span className={`badge ${e.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{e.status}</span></td>
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
