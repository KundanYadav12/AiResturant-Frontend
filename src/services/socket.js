import { io } from 'socket.io-client';
import { SOCKET_URL } from './api';

// ─── Socket.IO connection ─────────────────────────────────────────────────
// URL is read from .env via the centralized api.js export.
// To change the backend server, update VITE_SOCKET_URL in .env — nothing else.
// ──────────────────────────────────────────────────────────────────────────

let socket;

export const initiateSocketConnection = () => {
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true
  });
  console.log('Connecting socket to', SOCKET_URL);
  return socket;
};

export const disconnectSocket = () => {
  console.log('Disconnecting socket...');
  if (socket) socket.disconnect();
};

export const joinRestaurantRoom = (restaurantId) => {
  if (socket) {
    socket.emit('join_restaurant', restaurantId);
  }
};

export const joinOrderRoom = (orderId) => {
  if (socket) {
    socket.emit('join_order', orderId);
  }
};

export const subscribeToNewOrders = (cb) => {
  if (!socket) return;
  socket.on('NEW_ORDER', (order) => {
    console.log('Real-time: Received NEW_ORDER');
    cb(null, order);
  });
};

export const unsubscribeFromNewOrders = () => {
  if (socket) {
    socket.off('NEW_ORDER');
  }
};

export const subscribeToOrderStatus = (cb) => {
  if (!socket) return;
  socket.on('ORDER_STATUS_UPDATED', (order) => {
    console.log('Real-time: Received ORDER_STATUS_UPDATED');
    cb(null, order);
  });
};

export const unsubscribeFromOrderStatus = () => {
  if (socket) {
    socket.off('ORDER_STATUS_UPDATED');
  }
};

export const subscribeToTableRequests = (cb) => {
  if (!socket) return;

  socket.on('WAITER_REQUEST', (req) => {
    console.log('Real-time: Received WAITER_REQUEST');
    cb(null, { ...req, type: 'WAITER' });
  });

  socket.on('WATER_REQUEST', (req) => {
    console.log('Real-time: Received WATER_REQUEST');
    cb(null, { ...req, type: 'WATER' });
  });

  socket.on('BILL_REQUEST', (req) => {
    console.log('Real-time: Received BILL_REQUEST');
    cb(null, { ...req, type: 'BILL' });
  });

  socket.on('TABLE_STATUS_UPDATED', (data) => {
    console.log('Real-time: Received TABLE_STATUS_UPDATED');
    cb(null, { ...data, type: 'STATUS' });
  });
};

export const unsubscribeFromTableRequests = () => {
  if (socket) {
    socket.off('WAITER_REQUEST');
    socket.off('WATER_REQUEST');
    socket.off('BILL_REQUEST');
    socket.off('TABLE_STATUS_UPDATED');
  }
};

export default {
  initiateSocketConnection,
  disconnectSocket,
  joinRestaurantRoom,
  joinOrderRoom,
  subscribeToNewOrders,
  unsubscribeFromNewOrders,
  subscribeToOrderStatus,
  unsubscribeFromOrderStatus,
  subscribeToTableRequests,
  unsubscribeFromTableRequests
};