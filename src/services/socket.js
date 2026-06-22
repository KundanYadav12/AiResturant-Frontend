import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket;

export const initiateSocketConnection = () => {
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true
  });
  console.log('Connecting socket...');
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

export default {
  initiateSocketConnection,
  disconnectSocket,
  joinRestaurantRoom,
  joinOrderRoom,
  subscribeToNewOrders,
  unsubscribeToNewOrders: unsubscribeFromNewOrders,
  subscribeToOrderStatus,
  unsubscribeFromOrderStatus
};
