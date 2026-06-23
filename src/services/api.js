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
  // Public Menu Token-based APIs
  getCategoriesByToken: async (tableToken) => {
    const response = await api.get(`/menu/tables/token/${tableToken}/categories`);
    return response.data;
  },
  getMenuItemsByToken: async (tableToken) => {
    const response = await api.get(`/menu/tables/token/${tableToken}/items`);
    return response.data;
  },

  // Owner/Manager APIs (Using Auth Context)
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

  // Ingredients and Allergens Management
  getIngredients: async () => {
    const response = await api.get('/menu/ingredients');
    return response.data;
  },
  createIngredient: async (name) => {
    const response = await api.post('/menu/ingredients', { name });
    return response.data;
  },
  deleteIngredient: async (id) => {
    const response = await api.delete(`/menu/ingredients/${id}`);
    return response.data;
  },
  getMenuItemIngredients: async (itemId) => {
    const response = await api.get(`/menu/items/${itemId}/ingredients`);
    return response.data;
  },
  linkMenuItemIngredients: async (itemId, links) => {
    const response = await api.post(`/menu/items/${itemId}/ingredients`, { links });
    return response.data;
  },

  // Customizations Management
  getCustomizations: async (itemId) => {
    const response = await api.get(`/menu/items/${itemId}/customizations`);
    return response.data;
  },
  createCustomization: async (itemId, name, price) => {
    const response = await api.post(`/menu/items/${itemId}/customizations`, { name, price });
    return response.data;
  },
  deleteCustomization: async (id) => {
    const response = await api.delete(`/menu/customizations/${id}`);
    return response.data;
  },

  // FAQ Management
  getFAQs: async () => {
    const response = await api.get('/menu/faqs');
    return response.data;
  },
  createFAQ: async (question, answer) => {
    const response = await api.post('/menu/faqs', { question, answer });
    return response.data;
  },
  updateFAQ: async (id, question, answer) => {
    const response = await api.put(`/menu/faqs/${id}`, { question, answer });
    return response.data;
  },
  deleteFAQ: async (id) => {
    const response = await api.delete(`/menu/faqs/${id}`);
    return response.data;
  },

  // General Text Knowledge Base
  getGeneralKnowledge: async () => {
    const response = await api.get('/menu/knowledge');
    return response.data;
  },
  saveGeneralKnowledge: async (content) => {
    const response = await api.post('/menu/knowledge', { content });
    return response.data;
  },
};

export const orderAPI = {
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },
  sendAIChat: async (tableToken, message, cart, chatHistory) => {
    const response = await api.post('/orders/chat', {
      tableToken,
      message,
      cart,
      chatHistory,
    });
    return response.data;
  },
  getTableDetails: async (tableToken) => {
    const response = await api.get(`/orders/tables/token/${tableToken}`);
    return response.data;
  },
  requestTableAssistance: async (tableToken, requestType) => {
    const response = await api.post(`/orders/tables/token/${tableToken}/request`, { requestType });
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

  // Manager live requests & table status tracking
  getPendingRequests: async () => {
    const response = await api.get('/dashboard/requests');
    return response.data;
  },
  completeRequest: async (requestId, tableId) => {
    const response = await api.put(`/dashboard/requests/${requestId}/complete`, { tableId });
    return response.data;
  },
  getTableStatuses: async () => {
    const response = await api.get('/dashboard/tables/status');
    return response.data;
  },
};

// Super Admin platform APIs
export const saasAPI = {
  getStats: async () => {
    const response = await api.get('/saas/stats');
    return response.data;
  },
  getRestaurants: async () => {
    const response = await api.get('/saas/restaurants');
    return response.data;
  },
  updateSubscription: async (restaurantId, subscriptionData) => {
    const response = await api.put(`/saas/restaurants/${restaurantId}/subscription`, subscriptionData);
    return response.data;
  },
  createRestaurant: async (restaurantData) => {
    const response = await api.post('/saas/restaurants', restaurantData);
    return response.data;
  },
};

export default api;
