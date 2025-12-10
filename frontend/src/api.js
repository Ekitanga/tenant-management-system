const API_URL = 'http://localhost:5000/api';

// Get auth token
const getToken = () => localStorage.getItem('token');

// Generic API call helper
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token && !endpoint.includes('/auth/login')) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: async (username, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  getMe: async () => {
    return apiCall('/auth/me');
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: async () => {
    return apiCall('/dashboard/stats');
  },
};

// Properties API
export const propertiesAPI = {
  getAll: async () => {
    return apiCall('/properties');
  },

  getById: async (id) => {
    return apiCall(`/properties/${id}`);
  },

  create: async (data) => {
    return apiCall('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/properties/${id}`, {
      method: 'DELETE',
    });
  },
};

// Units API
export const unitsAPI = {
  getAll: async () => {
    return apiCall('/units');
  },

  getById: async (id) => {
    return apiCall(`/units/${id}`);
  },

  getAvailable: async () => {
    return apiCall('/units/available');
  },

  create: async (data) => {
    return apiCall('/units', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/units/${id}`, {
      method: 'DELETE',
    });
  },
};

// Tenants API
export const tenantsAPI = {
  getAll: async () => {
    return apiCall('/tenants');
  },

  getById: async (id) => {
    return apiCall(`/tenants/${id}`);
  },

  create: async (data) => {
    return apiCall('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/tenants/${id}`, {
      method: 'DELETE',
    });
  },

  allocate: async (tenantId, data) => {
    return apiCall(`/tenants/${tenantId}/allocate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Leases API - UPDATED WITH NEW WORKFLOW
export const leasesAPI = {
  getAll: async () => {
    return apiCall('/leases');
  },

  getById: async (id) => {
    return apiCall(`/leases/${id}`);
  },

  create: async (data) => {
    return apiCall('/leases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/leases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/leases/${id}`, {
      method: 'DELETE',
    });
  },

  // NEW: Send lease to tenant
  sendLease: async (id) => {
    return apiCall(`/leases/${id}/send`, {
      method: 'POST',
    });
  },

  // NEW: Mark lease as viewed by tenant
  viewLease: async (id) => {
    return apiCall(`/leases/${id}/view`, {
      method: 'POST',
    });
  },

  // NEW: Accept and sign lease (tenant)
  acceptLease: async (id, signature) => {
    return apiCall(`/leases/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    });
  },

  // NEW: Reject lease (tenant)
  rejectLease: async (id, reason) => {
    return apiCall(`/leases/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Terminate lease (landlord)
  terminate: async (id, data) => {
    return apiCall(`/leases/${id}/terminate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // DEPRECATED: Old methods (kept for backward compatibility)
  sendForSignature: async (id) => {
    return apiCall(`/leases/${id}/send`, {
      method: 'POST',
    });
  },

  sign: async (id, signature) => {
    return apiCall(`/leases/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ signature }),
    });
  },
};

// Payments API
export const paymentsAPI = {
  getAll: async () => {
    return apiCall('/payments');
  },

  getById: async (id) => {
    return apiCall(`/payments/${id}`);
  },

  create: async (data) => {
    return apiCall('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/payments/${id}`, {
      method: 'DELETE',
    });
  },
};

// Expenses API
export const expensesAPI = {
  getAll: async () => {
    return apiCall('/expenses');
  },

  getById: async (id) => {
    return apiCall(`/expenses/${id}`);
  },

  create: async (data) => {
    return apiCall('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },
};

// Maintenance API
export const maintenanceAPI = {
  getAll: async () => {
    return apiCall('/maintenance');
  },

  getById: async (id) => {
    return apiCall(`/maintenance/${id}`);
  },

  create: async (data) => {
    return apiCall('/maintenance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/maintenance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/maintenance/${id}`, {
      method: 'DELETE',
    });
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    return apiCall('/notifications');
  },

  markAsRead: async (id) => {
    return apiCall(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  markAllAsRead: async () => {
    return apiCall('/notifications/read-all', {
      method: 'PUT',
    });
  },
};

// Users API
export const usersAPI = {
  getAll: async () => {
    return apiCall('/users');
  },

  getById: async (id) => {
    return apiCall(`/users/${id}`);
  },

  create: async (data) => {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiCall(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};

export default apiCall;