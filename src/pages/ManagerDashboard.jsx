import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderCard from '../components/OrderCard';
import { orderAPI, authAPI, dashboardAPI } from '../services/api';
import socketHelper from '../services/socket';

const ManagerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [notification, setNotification] = useState(null);
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const restaurant = JSON.parse(localStorage.getItem('restaurant'));

  useEffect(() => {
    // Auth Check
    if (!localStorage.getItem('token') || !user || (user.role !== 'MANAGER' && user.role !== 'OWNER')) {
      navigate('/login');
      return;
    }

    if (restaurant) {
      setRestaurantName(restaurant.name);
    }

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (user?.restaurantId) {
      // Connect sockets
      socketHelper.initiateSocketConnection();
      socketHelper.joinRestaurantRoom(user.restaurantId);

      // Listen to new orders
      socketHelper.subscribeToNewOrders((err, newOrder) => {
        if (newOrder) {
          playAudioNotification('https://assets.mixkit.co/active_storage/sfx/2869/2869-700.wav');

          setNotification(`New order #${newOrder.id} placed at Table ${newOrder.table_number}!`);
          setTimeout(() => setNotification(null), 6000);

          setOrders(prev => {
            const exists = prev.some(o => o.id === newOrder.id);
            if (exists) {
              return prev.map(o => o.id === newOrder.id ? newOrder : o);
            }
            return [newOrder, ...prev];
          });

          // Refresh tables to reflect preparing order
          fetchTablesAndRequests();
        }
      });

      // Listen to table requests (water, bill, call waiter)
      socketHelper.subscribeToTableRequests((err, data) => {
        if (data) {
          playAudioNotification('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');

          if (data.type === 'WAITER') {
            setNotification(`🔔 Table ${data.table_number} is calling a Waiter!`);
          } else if (data.type === 'WATER') {
            setNotification(`💧 Table ${data.table_number} requested Water!`);
          } else if (data.type === 'BILL') {
            setNotification(`🧾 Table ${data.table_number} requested the Bill!`);
          }

          setTimeout(() => setNotification(null), 6000);

          // Update requests list and table statuses
          fetchTablesAndRequests();
        }
      });

      return () => {
        socketHelper.unsubscribeFromNewOrders();
        socketHelper.unsubscribeFromTableRequests();
        socketHelper.disconnectSocket();
      };
    }
  }, [user]);

  const playAudioNotification = (url) => {
    try {
      const audio = new Audio(url);
      audio.volume = 0.6;
      audio.play();
    } catch (e) {
      console.log('Autoplay blocked:', e);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOrders(),
        fetchTablesAndRequests()
      ]);
    } catch (err) {
      console.error('Failed to load initial dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await orderAPI.getOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  };

  const fetchTablesAndRequests = async () => {
    try {
      const [tableList, requestList] = await Promise.all([
        dashboardAPI.getTableStatuses(),
        dashboardAPI.getPendingRequests()
      ]);
      setTables(tableList);
      setRequests(requestList);
    } catch (err) {
      console.error('Failed to fetch table details:', err);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const response = await orderAPI.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? response.order : o));
      fetchTablesAndRequests(); // Refresh table status grid
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating order status.');
    }
  };

  const handleResolveRequest = async (requestId, tableId) => {
    try {
      await dashboardAPI.completeRequest(requestId, tableId);
      // Reload lists
      fetchTablesAndRequests();
    } catch (err) {
      console.error('Resolve request error:', err);
      alert('Failed to resolve request.');
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  // Filter orders by status
  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const preparingOrders = orders.filter(o => o.status === 'ACCEPTED' || o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');
  const completedOrders = orders.filter(o => o.status === 'DELIVERED' || o.status === 'REJECTED');

  const getTableStatusBadgeClass = (status) => {
    switch (status) {
      case 'FREE': return 'bg-success';
      case 'OCCUPIED': return 'bg-dark text-white';
      case 'PREPARING_ORDER': return 'bg-warning text-dark';
      case 'WAITING_FOR_BILL': return 'bg-danger text-white';
      case 'REQUESTED_WATER': return 'bg-info text-dark';
      case 'REQUESTED_WAITER': return 'bg-danger text-white';
      default: return 'bg-secondary';
    }
  };

  const getTableStatusText = (status) => {
    switch (status) {
      case 'FREE': return 'Free';
      case 'OCCUPIED': return 'Occupied';
      case 'PREPARING_ORDER': return 'Cooking';
      case 'WAITING_FOR_BILL': return 'Waiting for Bill';
      case 'REQUESTED_WATER': return 'Water Requested';
      case 'REQUESTED_WAITER': return 'Waiter Called';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Top Navbar */}
      <nav className="navbar navbar-dark bg-dark px-4 py-3 sticky-top shadow-sm">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1 fw-bold d-flex align-items-center">
            <i className="bi bi-speedometer2 text-primary me-2.5"></i>
            {restaurantName} 
            <span className="badge bg-primary ms-3 font-monospace" style={{ fontSize: '0.75rem' }}>Manager Dashboard</span>
          </span>
          <div className="d-flex align-items-center">
            <span className="text-light me-4 small d-none d-md-inline">
              <i className="bi bi-person-badge-fill me-1.5 text-secondary"></i> {user?.name}
            </span>
            {user?.role === 'OWNER' && (
              <button className="btn btn-outline-info btn-sm rounded-pill px-3.5 me-2" onClick={() => navigate('/admin')}>
                <i className="bi bi-gear me-1"></i> Admin Panel
              </button>
            )}
            <button className="btn btn-outline-danger btn-sm rounded-pill px-3.5" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i> Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Floating Notifications */}
      {notification && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-4 z-3 shadow-lg" style={{ maxWidth: '450px' }}>
          <div className="alert alert-primary bg-primary text-white border-0 p-3 rounded-pill d-flex align-items-center gap-3 slide-down" role="alert">
            <i className="bi bi-bell-fill fs-5 animate-bell"></i>
            <div className="fw-semibold small">{notification}</div>
            <button type="button" className="btn-close btn-close-white ms-auto" aria-label="Close" onClick={() => setNotification(null)}></button>
          </div>
        </div>
      )}

      {/* Grid Content */}
      <div className="container-fluid p-4">
        <div className="row g-4">
          
          {/* LEFT PANE: Order Kanban (Col-9) */}
          <div className="col-12 col-xl-9">
            <div className="row g-3">
              {/* Column 1: Pending */}
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card border-0 bg-warning-subtle min-vh-75 shadow-sm" style={{ borderRadius: '16px' }}>
                  <div className="card-header bg-warning text-dark border-0 py-3 d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                    <span className="fw-bold text-nowrap"><i className="bi bi-exclamation-octagon me-2"></i> PENDING APPROVAL</span>
                    <span className="badge bg-white text-dark rounded-pill fw-bold font-monospace">{pendingOrders.length}</span>
                  </div>
                  <div className="card-body p-2 overflow-y-auto" style={{ maxHeight: '680px' }}>
                    {pendingOrders.length === 0 ? (
                      <p className="text-center text-muted small py-4">No pending orders.</p>
                    ) : (
                      pendingOrders.map(order => (
                        <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: In Kitchen */}
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card border-0 bg-primary-subtle min-vh-75 shadow-sm" style={{ borderRadius: '16px' }}>
                  <div className="card-header bg-primary text-white border-0 py-3 d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                    <span className="fw-bold text-nowrap"><i className="bi bi-fire me-2"></i> PREPARING</span>
                    <span className="badge bg-white text-primary rounded-pill fw-bold font-monospace">{preparingOrders.length}</span>
                  </div>
                  <div className="card-body p-2 overflow-y-auto" style={{ maxHeight: '680px' }}>
                    {preparingOrders.length === 0 ? (
                      <p className="text-center text-muted small py-4">No meals preparing.</p>
                    ) : (
                      preparingOrders.map(order => (
                        <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Column 3: Ready to Serve */}
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card border-0 bg-success-subtle min-vh-75 shadow-sm" style={{ borderRadius: '16px' }}>
                  <div className="card-header bg-success text-white border-0 py-3 d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                    <span className="fw-bold text-nowrap"><i className="bi bi-bell-fill me-2"></i> READY TO SERVE</span>
                    <span className="badge bg-white text-success rounded-pill fw-bold font-monospace">{readyOrders.length}</span>
                  </div>
                  <div className="card-body p-2 overflow-y-auto" style={{ maxHeight: '680px' }}>
                    {readyOrders.length === 0 ? (
                      <p className="text-center text-muted small py-4">No ready plates.</p>
                    ) : (
                      readyOrders.map(order => (
                        <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Column 4: History */}
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card border-0 bg-secondary-subtle min-vh-75 shadow-sm" style={{ borderRadius: '16px' }}>
                  <div className="card-header bg-secondary text-white border-0 py-3 d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                    <span className="fw-bold text-nowrap"><i className="bi bi-archive me-2"></i> COMPLETED</span>
                    <span className="badge bg-white text-secondary rounded-pill fw-bold font-monospace">{completedOrders.length}</span>
                  </div>
                  <div className="card-body p-2 overflow-y-auto" style={{ maxHeight: '680px' }}>
                    {completedOrders.length === 0 ? (
                      <p className="text-center text-muted small py-4">No completed orders.</p>
                    ) : (
                      completedOrders.slice(0, 10).map(order => (
                        <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANE: Table Status & Requests Dashboard (Col-3) */}
          <div className="col-12 col-xl-3">
            <div className="d-flex flex-column gap-3">
              
              {/* Table Requests Panel */}
              <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                <div className="card-header bg-dark text-white border-0 py-3 fw-bold" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                  <i className="bi bi-bell-fill text-danger me-2 animate-bell"></i> Table Requests
                  {requests.length > 0 && <span className="badge bg-danger ms-2 rounded-pill font-monospace">{requests.length}</span>}
                </div>
                <div className="card-body p-3 overflow-y-auto" style={{ maxHeight: '300px' }}>
                  {requests.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <i className="bi bi-check-circle text-success fs-3 mb-2 d-block"></i>
                      <span className="small">All requests cleared!</span>
                    </div>
                  ) : (
                    requests.map(req => (
                      <div key={req.id} className="card border-light shadow-sm p-3 mb-2 rounded-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="fw-bold mb-1">{req.table_number}</h6>
                            <span className={`badge ${
                              req.request_type === 'WAITER' ? 'bg-danger' :
                              req.request_type === 'WATER' ? 'bg-info text-dark' : 'bg-success'
                            }`}>
                              {req.request_type === 'WAITER' ? '🔔 CALL WAITER' :
                               req.request_type === 'WATER' ? '💧 WATER REQUEST' : '🧾 BILL REQUEST'}
                            </span>
                            <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                              {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <button 
                            className="btn btn-outline-success btn-sm rounded-pill px-3"
                            onClick={() => handleResolveRequest(req.id, req.table_id)}
                          >
                            Resolve
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Live Table Grid */}
              <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                <div className="card-header bg-dark text-white border-0 py-3 fw-bold" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                  <i className="bi bi-grid-3x3-gap-fill text-primary me-2"></i> Table Layout Status
                </div>
                <div className="card-body p-3">
                  {tables.length === 0 ? (
                    <p className="text-center text-muted small py-4">No dining tables configured.</p>
                  ) : (
                    <div className="row g-2">
                      {tables.map(table => (
                        <div key={table.id} className="col-6">
                          <div className={`card text-center p-3 border-0 rounded-3 shadow-sm ${getTableStatusBadgeClass(table.status)}`}>
                            <h6 className="fw-bold mb-1 text-truncate" style={{ fontSize: '0.95rem' }}>{table.table_number}</h6>
                            <small className="fw-semibold text-truncate d-block" style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                              {getTableStatusText(table.status)}
                            </small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      <style>{`
        .min-vh-75 { min-height: 75vh; }
        @keyframes ring {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(4deg); }
          85% { transform: rotate(-4deg); }
        }
        .animate-bell {
          animation: ring 1.8s infinite ease-in-out;
        }
        .slide-down {
          animation: slide-in-down 0.4s ease-out;
        }
        @keyframes slide-in-down {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ManagerDashboard;
