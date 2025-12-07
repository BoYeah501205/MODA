// ============================================================================
// API Client - Backend communication with localStorage fallback
// ============================================================================

// Dynamically determine backend URL based on how frontend is accessed
const getApiBase = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  return `http://${hostname}:3001/api`;
};

const API_BASE = getApiBase();
let isBackendAvailable = null;

console.log('[API] Backend URL:', API_BASE);

// Check if backend is available
async function checkBackend() {
  if (isBackendAvailable !== null) return isBackendAvailable;
  
  try {
    const response = await fetch(`${API_BASE}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    isBackendAvailable = response.ok;
  } catch (err) {
    isBackendAvailable = false;
  }
  
  console.log(`[API] Backend ${isBackendAvailable ? 'available' : 'unavailable'}`);
  return isBackendAvailable;
}

// Generic request helper
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

// API Client
export const apiClient = {
  checkBackend,
  
  // Projects
  projects: {
    getAll: async () => {
      if (!await checkBackend()) {
        return JSON.parse(localStorage.getItem('autovol_projects') || '[]');
      }
      return request('/projects');
    },
    
    get: async (id) => {
      if (!await checkBackend()) {
        const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
        return projects.find(p => p.id === id);
      }
      return request(`/projects/${id}`);
    },
    
    create: async (project) => {
      if (!await checkBackend()) {
        const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
        projects.push(project);
        localStorage.setItem('autovol_projects', JSON.stringify(projects));
        return project;
      }
      return request('/projects', { method: 'POST', body: project });
    },
    
    update: async (id, updates) => {
      if (!await checkBackend()) {
        const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
          projects[index] = { ...projects[index], ...updates };
          localStorage.setItem('autovol_projects', JSON.stringify(projects));
        }
        return projects[index];
      }
      return request(`/projects/${id}`, { method: 'PUT', body: updates });
    },
    
    delete: async (id) => {
      if (!await checkBackend()) {
        const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
        localStorage.setItem('autovol_projects', JSON.stringify(projects.filter(p => p.id !== id)));
        return { message: 'Deleted' };
      }
      return request(`/projects/${id}`, { method: 'DELETE' });
    }
  },
  
  // Employees
  employees: {
    getAll: async () => {
      if (!await checkBackend()) {
        return JSON.parse(localStorage.getItem('autovol_employees') || '[]');
      }
      return request('/employees');
    },
    
    create: async (employee) => {
      if (!await checkBackend()) {
        const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
        employees.push(employee);
        localStorage.setItem('autovol_employees', JSON.stringify(employees));
        return employee;
      }
      return request('/employees', { method: 'POST', body: employee });
    },
    
    update: async (id, updates) => {
      if (!await checkBackend()) {
        const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
        const index = employees.findIndex(e => e.id === id);
        if (index !== -1) {
          employees[index] = { ...employees[index], ...updates };
          localStorage.setItem('autovol_employees', JSON.stringify(employees));
        }
        return employees[index];
      }
      return request(`/employees/${id}`, { method: 'PUT', body: updates });
    },
    
    delete: async (id) => {
      if (!await checkBackend()) {
        const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
        localStorage.setItem('autovol_employees', JSON.stringify(employees.filter(e => e.id !== id)));
        return { message: 'Deleted' };
      }
      return request(`/employees/${id}`, { method: 'DELETE' });
    }
  },
  
  // Sync
  sync: {
    importFromLocalStorage: async () => {
      if (!await checkBackend()) {
        throw new Error('Backend not available');
      }
      
      const data = {
        projects: JSON.parse(localStorage.getItem('autovol_projects') || '[]'),
        trashedProjects: JSON.parse(localStorage.getItem('autovol_trash_projects') || '[]'),
        employees: JSON.parse(localStorage.getItem('autovol_employees') || '[]'),
        trashedEmployees: JSON.parse(localStorage.getItem('autovol_trash_employees') || '[]'),
        departments: JSON.parse(localStorage.getItem('autovol_departments') || '[]')
      };
      
      return request('/sync/import', { method: 'POST', body: data });
    },
    
    exportFromBackend: async () => {
      if (!await checkBackend()) {
        throw new Error('Backend not available');
      }
      return request('/sync/export');
    },
    
    syncToLocalStorage: async () => {
      const data = await apiClient.sync.exportFromBackend();
      
      localStorage.setItem('autovol_projects', JSON.stringify(data.projects || []));
      localStorage.setItem('autovol_trash_projects', JSON.stringify(data.trashedProjects || []));
      localStorage.setItem('autovol_employees', JSON.stringify(data.employees || []));
      localStorage.setItem('autovol_trash_employees', JSON.stringify(data.trashedEmployees || []));
      
      return { message: 'Synced to localStorage', data };
    }
  }
};

export default apiClient;
