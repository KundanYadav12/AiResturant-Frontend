import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('restaurant', JSON.stringify(response.data.restaurant));
    }
    return response.data;
  },
  signup: async (signupData) => {
    const response = await api.post('/auth/signup', signupData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('restaurant');
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const menuAPI = {
  getCategories: async (restaurantId) => {
    const response = await api.get(`/menu/restaurants/${restaurantId}/categories`);
    return response.data;
  },
  getMenuItems: async (restaurantId, includeInactive = false) => {
    const response = await api.get(`/menu/restaurants/${restaurantId}/items?includeInactive=${includeInactive}`);
    return response.data;
  },
  createCategory: async (name) => {
    const response = await api.post('/menu/categories', { name });
    return response.data;
  },
  updateCategory: async (id, name) => {
    const response = await api.put(`/menu/categories/${id}`, { name });
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await api.delete(`/menu/categories/${id}`);
    return response.data;
  },
  createMenuItem: async (formData) => {
    const response = await api.post('/menu/items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  updateMenuItem: async (id, formData) => {
    const response = await api.put(`/menu/items/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  deleteMenuItem: async (id) => {
    const response = await api.delete(`/menu/items/${id}`);
    return response.data;
  },
};

export const orderAPI = {
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },
  sendAIChat: async (restaurantId, message, cart, chatHistory) => {
    const response = await api.post('/orders/chat', {
      restaurantId,
      message,
      cart,
      chatHistory,
    });
    return response.data;
  },
  getTableDetails: async (tableId) => {
    const response = await api.get(`/orders/tables/${tableId}`);
    return response.data;
  },
  getOrderStatus: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/public`);
    return response.data;
  },
  getOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },
  updateOrderStatus: async (orderId, status) => {
    const response = await api.put(`/orders/${orderId}/status`, { status });
    return response.data;
  },
};

export const dashboardAPI = {
  getAnalytics: async () => {
    const response = await api.get('/dashboard/analytics');
    return response.data;
  },
  getTables: async () => {
    const response = await api.get('/dashboard/tables');
    return response.data;
  },
  createTable: async (tableNumber) => {
    const response = await api.post('/dashboard/tables', { tableNumber });
    return response.data;
  },
  deleteTable: async (id) => {
    const response = await api.delete(`/dashboard/tables/${id}`);
    return response.data;
  },
};

export default api;
