import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ChatBox from '../components/ChatBox';
import OrderSummary from '../components/OrderSummary';
import { orderAPI } from '../services/api';
import socketHelper from '../services/socket';

const CustomerOrder = () => {
  const { tableToken } = useParams();

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

  // Table Request status tracking
  const [requestLoading, setRequestLoading] = useState(null); // 'WAITER', 'WATER', 'BILL'
  const [activeRequestMsg, setActiveRequestMsg] = useState(null);

  // Voice Assistant states & utilities
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);

  const speakText = (text, force = false) => {
    if ((voiceOutputEnabled || force) && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let cleanedText = text
        .replace(/₹/g, 'Rupees ')
        .replace(/\n/g, ' ')
        .replace(/[*#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'en-IN';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleVoice = () => {
    const newVal = !voiceOutputEnabled;
    setVoiceOutputEnabled(newVal);
    if (newVal) {
      speakText('Voice assistant activated', true);
    } else {
      handleStopSpeaking();
    }
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  useEffect(() => {
    fetchTableDetails();
  }, [tableToken]);

  useEffect(() => {
    if (placedOrder) {
      const socket = socketHelper.initiateSocketConnection();

      socket.on('connect', () => {
        setSocketConnected(true);
        socketHelper.joinOrderRoom(placedOrder.id);
      });

      socketHelper.subscribeToOrderStatus((err, updatedOrder) => {
        if (updatedOrder && updatedOrder.id === placedOrder.id) {
          setPlacedOrder(updatedOrder);
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.log('Audio autoplay prevented:', e);
          }
          speakText(`Your order status is now ${updatedOrder.status.toLowerCase()}`);
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
      const data = await orderAPI.getTableDetails(tableToken);
      setTable(data);
      setMessages([
        {
          sender: 'bot',
          text: `Welcome to ${data.restaurant_name}! \nI am your AI Server. Tap the microphone or type to order. E.g. "1 Paneer Tikka with extra cheese, and 2 Cokes". \n\nYou can also ask me menu, dietary, FAQ or allergen questions!`,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid QR code or QR code is expired. Please verify with a restaurant manager.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text) => {
    const userMsg = { sender: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const chatHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const response = await orderAPI.sendAIChat(tableToken, text, cart, chatHistory);
      setCart(response.items || []);
      const assistantText = response.assistantResponse;
      setMessages(prev => [...prev, { sender: 'bot', text: assistantText, timestamp: new Date() }]);
      speakText(assistantText);
    } catch (err) {
      console.error('AI chat error:', err);
      const errorFallback = 'Sorry, I hit a snag parsing that message. Could you try phrasing it differently or tell me manually?';
      setMessages(prev => [...prev, { sender: 'bot', text: errorFallback, timestamp: new Date() }]);
      speakText(errorFallback);
    } finally {
      setIsTyping(false);
    }
  };

  const handleTableRequest = async (type) => {
    try {
      setRequestLoading(type);
      setActiveRequestMsg(null);
      await orderAPI.requestTableAssistance(tableToken, type);
      let msg = '';
      if (type === 'WAITER') msg = '🔔 Waiter has been called to your table.';
      if (type === 'WATER') msg = '💧 Water has been requested for your table.';
      if (type === 'BILL') msg = '🧾 Bill has been requested.';
      setActiveRequestMsg(msg);
      setTimeout(() => setActiveRequestMsg(null), 6000);
    } catch (err) {
      console.error('Table request error:', err);
      alert('Failed to send request. Please ask restaurant staff directly.');
    } finally {
      setRequestLoading(null);
    }
  };

  const handleUpdateQty = (menuItemId, newQty) => {
    if (newQty <= 0) { handleRemoveItem(menuItemId); return; }
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
      const result = await orderAPI.createOrder({ tableToken, totalAmount, notes, items: cart });
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
      case 'ACCEPTED': return 'Order Accepted! 🎉';
      case 'PREPARING': return 'Chef is cooking your meal... 👨‍🍳';
      case 'READY': return 'Your order is ready! Waiter is bringing it to you... 🛎️';
      case 'DELIVERED': return 'Order Served! Enjoy your food! 🍽️';
      case 'REJECTED': return 'Order rejected. Please check with waiter.';
      default: return '';
    }
  };

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="fw-semibold text-secondary">Initializing Digital AI Menu...</p>
      </div>
    );
  }

  // ─── Error screen ─────────────────────────────────────────────────────────
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

  // ─── Order Tracking Screen ────────────────────────────────────────────────
  if (placedOrder) {
    const isRejected = placedOrder.status === 'REJECTED';
    const isDelivered = placedOrder.status === 'DELIVERED';

    return (
      <div className="min-vh-100 bg-light py-4">
        <div className="container" style={{ maxWidth: '650px' }}>
          <div className="card shadow-lg border-0 p-4" style={{ borderRadius: '20px' }}>
            {/* Tracking Header */}
            <div className="text-center mb-4">
              <span className="badge bg-secondary mb-2">Order #{placedOrder.id}</span>
              <h3 className="fw-bold text-dark mb-1">{table.restaurant_name}</h3>
              <p className="text-primary fw-bold mb-3" style={{ fontSize: '1rem' }}>
                <i className="bi bi-geo-alt-fill me-1"></i>Table {table.table_number}
              </p>
              <button
                className={`btn ${voiceOutputEnabled ? 'btn-primary' : 'btn-outline-secondary'} rounded-pill fw-semibold d-inline-flex align-items-center gap-2`}
                style={{ minWidth: '140px', height: '40px', fontSize: '0.9rem' }}
                onClick={handleToggleVoice}
              >
                <i className={`bi ${voiceOutputEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`}></i>
                AI Voice: {voiceOutputEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="d-flex gap-2 mb-4">
              {[
                { type: 'WAITER', label: 'Call Waiter', icon: '🔔', loadingLabel: 'Calling...', cls: 'btn-outline-danger' },
                { type: 'WATER',  label: 'Water',       icon: '💧', loadingLabel: 'Requesting...', cls: 'btn-outline-info' },
                { type: 'BILL',   label: 'Bill',        icon: '🧾', loadingLabel: 'Requesting...', cls: 'btn-outline-success' },
              ].map(({ type, label, icon, loadingLabel, cls }) => (
                <button
                  key={type}
                  className={`btn ${cls} fw-semibold flex-fill`}
                  style={{ height: '44px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  disabled={requestLoading !== null}
                  onClick={() => handleTableRequest(type)}
                >
                  {requestLoading === type ? loadingLabel : `${icon} ${label}`}
                </button>
              ))}
            </div>

            {activeRequestMsg && (
              <div className="alert alert-success text-center py-2 mb-4" role="alert">
                <small className="fw-bold">{activeRequestMsg}</small>
              </div>
            )}

            {/* Status Tracker */}
            <div className="card border-0 bg-light p-4 mb-4 rounded-3 text-center">
              <h5 className={`fw-bold ${isRejected ? 'text-danger' : 'text-primary'} mb-3`}>
                {isRejected ? '❌ ORDER REJECTED' : placedOrder.status}
              </h5>
              <div className="progress mb-3 border" style={{ height: '10px', borderRadius: '10px' }}>
                <div
                  className={`progress-bar progress-bar-striped progress-bar-animated ${isRejected ? 'bg-danger' : isDelivered ? 'bg-secondary' : 'bg-success'}`}
                  role="progressbar"
                  style={{ width: `${getProgressPercentage(placedOrder.status)}%` }}
                ></div>
              </div>
              <p className="small mb-0 text-secondary fw-semibold">{getStatusText(placedOrder.status)}</p>
            </div>

            {/* Order Details */}
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
                          <span key={cIdx} className="badge bg-warning-subtle text-warning-emphasis rounded-pill" style={{ fontSize: '0.7rem' }}>{c}</span>
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
                <small className="d-block fw-bold mb-1"><i className="bi bi-chat-left-text-fill me-1"></i>Kitchen Instructions</small>
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
                  <i className="bi bi-info-circle me-1"></i>You can order additional items once this order is served.
                </small>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── AI Chat Ordering Screen ──────────────────────────────────────────────
  return (
    <div className="min-vh-100 bg-light" style={{ paddingBottom: '80px' }}>
      {/* ── Top Header ── */}
      <div
        className="sticky-top bg-white shadow-sm px-3 py-2"
        style={{ zIndex: 100, borderBottom: '2px solid #e9ecef' }}
      >
        {/* Row 1 – Restaurant name + table */}
        <div className="d-flex align-items-center justify-content-between">
          <div style={{ minWidth: 0 }}>
            <h1
              className="fw-bold text-dark mb-0 text-truncate"
              style={{ fontSize: 'clamp(1rem, 4vw, 1.4rem)', lineHeight: 1.2 }}
            >
              {table?.restaurant_name}
            </h1>
            <div className="d-flex align-items-center gap-1 mt-1">
              <i className="bi bi-geo-alt-fill text-primary" style={{ fontSize: '0.75rem' }}></i>
              <span
                className="fw-semibold text-primary"
                style={{ fontSize: 'clamp(0.72rem, 2.5vw, 0.9rem)' }}
              >
                Dining Table: {table?.table_number}
              </span>
            </div>
          </div>

          {/* Row 1 – controls: Voice toggle + Staff Portal */}
          <div className="d-flex align-items-center gap-2 flex-shrink-0 ms-2">
            <button
              className={`btn ${voiceOutputEnabled ? 'btn-primary' : 'btn-outline-secondary'} fw-semibold d-flex align-items-center gap-1`}
              style={{ height: '38px', minWidth: '100px', fontSize: '0.8rem', borderRadius: '20px' }}
              onClick={handleToggleVoice}
              title={voiceOutputEnabled ? 'Mute AI Voice' : 'Enable AI Voice'}
            >
              <i className={`bi ${voiceOutputEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`}></i>
              <span>AI {voiceOutputEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <Link
              to="/login"
              className="btn btn-outline-dark fw-semibold d-flex align-items-center gap-1"
              style={{ height: '38px', fontSize: '0.8rem', borderRadius: '20px' }}
            >
              <i className="bi bi-person-badge"></i>
              <span className="d-none d-sm-inline">Staff</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="container pt-3">
        {/* ── Quick Action Buttons ── */}
        <div className="d-flex gap-2 mb-3">
          {[
            { type: 'WAITER', label: 'Call Waiter', icon: '🔔', loadingLabel: 'Calling...', cls: 'btn-danger' },
            { type: 'WATER',  label: 'Water',       icon: '💧', loadingLabel: 'Requesting...', cls: 'btn-info text-white' },
            { type: 'BILL',   label: 'Request Bill', icon: '🧾', loadingLabel: 'Requesting...', cls: 'btn-success' },
          ].map(({ type, label, icon, loadingLabel, cls }) => (
            <button
              key={type}
              className={`btn ${cls} fw-bold flex-fill`}
              style={{ height: '46px', fontSize: 'clamp(0.72rem, 2.5vw, 0.9rem)', whiteSpace: 'nowrap' }}
              disabled={requestLoading !== null}
              onClick={() => handleTableRequest(type)}
            >
              {requestLoading === type ? loadingLabel : `${icon} ${label}`}
            </button>
          ))}
        </div>

        {/* ── Request Feedback Alert ── */}
        {activeRequestMsg && (
          <div className="alert alert-success alert-dismissible fade show text-center py-2 mb-3" role="alert">
            <i className="bi bi-check-circle-fill me-2"></i>
            <strong>{activeRequestMsg}</strong>
            <button type="button" className="btn-close py-2" onClick={() => setActiveRequestMsg(null)}></button>
          </div>
        )}

        {/* ── Dual Column Layout ── */}
        <div className="row g-3">
          {/* Chat column */}
          <div className="col-12 col-lg-6">
            <ChatBox
              messages={messages}
              isTyping={isTyping}
              onSendMessage={handleSendMessage}
              disabled={isSubmitting}
              onStopSpeaking={handleStopSpeaking}
              voiceOutputEnabled={voiceOutputEnabled}
              onToggleVoice={handleToggleVoice}
            />
          </div>

          {/* Order Summary column */}
          <div className="col-12 col-lg-6">
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

      {/* ── Sticky Confirm CTA (mobile only, shown when cart has items) ── */}
      {cart.length > 0 && (
        <div
          className="d-lg-none fixed-bottom bg-white px-3 py-2"
          style={{
            boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
            borderTop: '2px solid #e9ecef',
            zIndex: 200,
          }}
        >
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div className="fw-bold text-dark" style={{ fontSize: '0.85rem' }}>
              <span className="badge bg-primary rounded-pill me-1">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
              items · <span className="text-primary">₹{cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(0)}</span>
            </div>
            <button
              className="btn btn-primary fw-bold d-flex align-items-center gap-2 flex-fill"
              style={{ height: '48px', borderRadius: '14px', fontSize: '0.95rem' }}
              onClick={() => {
                const el = document.getElementById('order-summary-section');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Placing...
                </>
              ) : (
                <>
                  <i className="bi bi-cart-check-fill"></i>
                  View & Confirm Order
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 991px) {
          .min-vh-100 { padding-bottom: 80px; }
        }
      `}</style>
    </div>
  );
};

export default CustomerOrder;