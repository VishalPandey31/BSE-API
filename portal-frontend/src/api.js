const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
    });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export const api = {
    // Auth
    getAuthEmployees: () => apiFetch('/auth/employees'),

    // Clients
    getClients: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/clients?${qs}`);
    },
    getCities: () => apiFetch('/clients/cities'),

    // Trades
    getTrades: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/trades?${qs}`);
    },
    getSymbols: () => apiFetch('/trades/symbols'),

    // Employees
    getEmployees: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/employees?${qs}`);
    },
    getDepartments: () => apiFetch('/employees/departments'),

    // My Clients
    getMyClients: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/employees/my-clients?${qs}`);
    },

    // Incentives
    getIncentives: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiFetch(`/incentives?${qs}`);
    },

    // Sync
    triggerSync: (entity = 'all') =>
        apiFetch('/sync/trigger', { method: 'POST', body: JSON.stringify({ entity }) }),
    getSyncStatus: () => apiFetch('/sync/status'),

    // Dashboard
    getDashboardStats: () => apiFetch('/dashboard/stats')
};
