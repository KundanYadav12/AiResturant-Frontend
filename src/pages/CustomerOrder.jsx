import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import OrderSummary from '../components/OrderSummary';
import { orderAPI } from '../services/api';
import socketHelper from '../services/socket';

const CustomerOrder = () => {
  const { restaurantId, tableId } = useParams();
  
  // Table & Restaurant details
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chat & Order states
  const [messages, setMessages] = useState([]);
  const [cart, setCart] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Placed Order Tracking states
  const [placedOrder, setPlacedOrder] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    fetchTableDetails();
  }, [tableId]);

  useEffect(() => {
    if (placedOrder) {
      // Initiate Socket Connection to track order status updates in real-time
      const socket = socketHelper.initiateSocketConnection();
      
      socket.on('connect', () => {
        setSocketConnected(true);
        socketHelper.joinOrderRoom(placedOrder.id);
      });

      socketHelper.subscribeToOrderStatus((err, updatedOrder) => {
        if (updatedOrder && updatedOrder.id === placedOrder.id) {
          setPlacedOrder(updatedOrder);
          
          // Trigger browser notification sound if status updates
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.log('Audio autoplay prevented:', e);
          }
        }
      });

      return () => {
        socketHelper.unsubscribeFromOrderStatus();
        socketHelper.disconnectSocket();
      };
    }
  }, [placedOrder]);

  const fetchTableDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderAPI.getTableDetails(tableId);
      setTable(data);
      
      // Seed welcome message
      setMessages([
        {
          sender: 'bot',
          text: `Welcome to ${data.restaurant_name}! \nI am your AI Server. Scan your table and tell me what you would like to order. For example: "1 Paneer Tikka with extra cheese, and 2 Cokes".`,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error(err);
      setError('Invalid QR code or QR code is expired. Please verify with a restaurant manager.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text) => {
    // 1. Add user message to state
    const userMsg = { sender: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Create chat history to pass to Claude (excluding the current one)
      const chatHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      // 2. Call backend Claude AI order parser
      const response = await orderAPI.sendAIChat(
        restaurantId,
        text,
        cart,
        chatHistory
      );

      // 3. Update cart and bot response
      setCart(response.items || []);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: response.assistantResponse,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Sorry, I hit a snag parsing that message. Could you try phrasing it differently or tell me manually?',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleUpdateQty = (menuItemId, newQty) => {
    if (newQty <= 0) {
      handleRemoveItem(menuItemId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.menu_item_id === menuItemId ? { ...item, quantity: newQty } : item
    ));
  };

  const handleRemoveItem = (menuItemId) => {
    setCart(prev => prev.filter(item => item.menu_item_id !== menuItemId));
  };

  const handleSubmitOrder = async (notes) => {
    if (cart.length === 0) return;
    
    try {
      setIsSubmitting(true);
      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      const orderData = {
        restaurantId,
        tableId,
        totalAmount,
        notes,
        items: cart
      };

      const result = await orderAPI.createOrder(orderData);
      setPlacedOrder(result.order);
    } catch (err) {
      console.error('Submit order error:', err);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressPercentage = (status) => {
    switch (status) {
      case 'PENDING': return 15;
      case 'ACCEPTED': return 35;
      case 'PREPARING': return 60;
      case 'READY': return 85;
      case 'DELIVERED': return 100;
      case 'REJECTED': return 100;
      default: return 0;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING': return 'Waiting for Restaurant to Accept...';
      case 'ACCEPTED': return 'Order Accepted!';
      case 'PREPARING': return 'Chef is cooking your meal...';
      case 'READY': return 'Your order is ready! Waiter is bringing it to your table...';
      case 'DELIVERED': return 'Order Served! Enjoy your food!';
      case 'REJECTED': return 'Order rejected. Please check with waiter.';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="fw-semibold text-secondary animate-pulse">Initializing Digital AI Menu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container min-vh-100 d-flex align-items-center justify-content-center">
        <div className="card shadow border-0 p-5 text-center bg-white" style={{ maxWidth: '500px', borderRadius: '20px' }}>
          <i className="bi bi-exclamation-triangle-fill text-danger display-3 mb-4"></i>
          <h4 className="fw-bold mb-3">Access Denied</h4>
          <p className="text-secondary mb-0">{error}</p>
        </div>
      </div>
    );
  }

  // --- Placed Order Tracking Screen ---
  if (placedOrder) {
    const isRejected = placedOrder.status === 'REJECTED';
    const isDelivered = placedOrder.status === 'DELIVERED';

    return (
      <div className="min-vh-100 bg-light-subtle py-5">
        <div className="container" style={{ maxWidth: '650px' }}>
          <div className="card shadow-lg border-0 p-4" style={{ borderRadius: '20px' }}>
            <div className="text-center mb-4">
              <span className="badge bg-secondary mb-2">Order #{placedOrder.id}</span>
              <h3 className="fw-bold text-dark mb-1">{table.restaurant_name}</h3>
              <p className="text-muted fw-semibold">Table {table.table_number}</p>
            </div>

            {/* Status Tracker visualizer */}
            <div className="card border-0 bg-light p-4 mb-4 rounded-3 text-center">
              <h5 className={`fw-bold ${isRejected ? 'text-danger' : 'text-primary'} mb-3`}>
                {isRejected ? 'ORDER REJECTED' : placedOrder.status}
              </h5>
              
              <div className="progress mb-3 border" style={{ height: '10px', borderRadius: '10px' }}>
                <div 
                  className={`progress-bar progress-bar-striped progress-bar-animated ${isRejected ? 'bg-danger' : isDelivered ? 'bg-secondary' : 'bg-success'}`}
                  role="progressbar" 
                  style={{ width: `${getProgressPercentage(placedOrder.status)}%` }}
                ></div>
              </div>
              
              <p className="small mb-0 text-secondary fw-semibold">
                {getStatusText(placedOrder.status)}
              </p>
            </div>

            {/* Placed Order Summary details */}
            <h6 className="fw-bold text-dark border-bottom pb-2 mb-3">Order Details</h6>
            <div className="mb-4">
              {placedOrder.items && placedOrder.items.map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between py-2 border-bottom border-light">
                  <div>
                    <span className="fw-semibold text-dark" style={{ fontSize: '0.9rem' }}>
                      {item.quantity} x {item.item_name}
                    </span>
                    {item.customizations && item.customizations.length > 0 && (
                      <div className="mt-1 d-flex flex-wrap gap-1">
                        {item.customizations.map((c, cIdx) => (
                          <span key={cIdx} className="badge bg-warning-subtle text-warning-emphasis rounded-pill" style={{ fontSize: '0.7rem' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-monospace fw-bold text-dark" style={{ fontSize: '0.9rem' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {placedOrder.notes && (
              <div className="bg-warning-subtle border border-warning-subtle text-warning-emphasis p-3 rounded-3 mb-4">
                <small className="d-block fw-bold mb-1"><i className="bi bi-chat-left-text-fill me-1"></i> Kitchen Instructions</small>
                <span className="small font-monospace">{placedOrder.notes}</span>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center fw-bold bg-dark text-white p-3 rounded-3 mb-4">
              <span>Grand Total</span>
              <span className="font-monospace fs-5">₹{parseFloat(placedOrder.total_amount).toFixed(2)}</span>
            </div>

            <div className="text-center">
              <button 
                className="btn btn-outline-primary px-4 py-2 rounded-pill fw-bold"
                onClick={() => setPlacedOrder(null)}
                disabled={placedOrder.status !== 'DELIVERED' && placedOrder.status !== 'REJECTED'}
              >
                Place Another Order
              </button>
              {(placedOrder.status !== 'DELIVERED' && placedOrder.status !== 'REJECTED') && (
                <small className="d-block text-muted mt-2">
                  <i className="bi bi-info-circle me-1"></i> You can order additional items or chat with the AI waiter once this order is served.
                </small>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- AI Chat Ordering Screen ---
  return (
    <div className="min-vh-100 bg-light py-4 py-md-5">
      <div className="container">
        {/* Restaurant Header banner */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
          <div>
            <h2 className="fw-extrabold text-dark mb-1">{table?.restaurant_name}</h2>
            <p className="text-muted mb-0 fw-semibold">
              <i className="bi bi-geo-alt me-1 text-primary"></i> Dining Table: <span className="text-primary">{table?.table_number}</span>
            </p>
          </div>
          <Link to="/login" className="btn btn-sm btn-outline-secondary px-3 py-1.5 rounded-pill fw-semibold">
            Staff Portal
          </Link>
        </div>

        {/* Dynamic Dual columns layout (Chat & Order summary) */}
        <div className="row g-4">
          <div className="col-lg-7">
            <ChatBox
              messages={messages}
              isTyping={isTyping}
              onSendMessage={handleSendMessage}
              disabled={isSubmitting}
            />
          </div>
          <div className="col-lg-5">
            <OrderSummary
              cart={cart}
              onUpdateQty={handleUpdateQty}
              onRemoveItem={handleRemoveItem}
              onSubmitOrder={handleSubmitOrder}
              isSubmitting={isSubmitting}
              tableNumber={table?.table_number}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrder;
