import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { saasAPI, authAPI } from '../services/api';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Tenant Creation Form States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newRestPhone, setNewRestPhone] = useState('');
  const [newRestAddress, setNewRestAddress] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newPlan, setNewPlan] = useState('FREE');
  const [formSubmitLoading, setFormSubmitLoading] = useState(false);

  // Subscription adjustment states
  const [updatingId, setUpdatingId] = useState(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    // Super Admin check
    if (!localStorage.getItem('token') || !user || user.role !== 'SUPER_ADMIN') {
      navigate('/login');
      return;
    }
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [statsData, listData] = await Promise.all([
        saasAPI.getStats(),
        saasAPI.getRestaurants()
      ]);
      setStats(statsData);
      setRestaurants(listData);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load platform data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRestaurant = async (e) => {
    e.preventDefault();
    if (!newRestName || !newOwnerName || !newOwnerEmail || !newOwnerPassword) {
      alert('Please fill all required fields');
      return;
    }
    try {
      setFormSubmitLoading(true);
      await saasAPI.createRestaurant({
        restaurantName: newRestName,
        phone: newRestPhone,
        address: newRestAddress,
        ownerName: newOwnerName,
        ownerEmail: newOwnerEmail,
        ownerPassword: newOwnerPassword,
        subscriptionPlan: newPlan
      });
      alert('Restaurant and Owner account created successfully!');
      // Reset form fields
      setNewRestName('');
      setNewRestPhone('');
      setNewRestAddress('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewOwnerPassword('');
      setNewPlan('FREE');
      setShowCreateForm(false);
      
      // Reload stats and tables
      loadPlatformData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create restaurant');
    } finally {
      setFormSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (restaurantId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMsg = `Are you sure you want to ${nextStatus === 'ACTIVE' ? 'ACTIVATE' : 'SUSPEND'} this restaurant? ${
      nextStatus === 'SUSPENDED' ? 'All dining QR codes for this restaurant will be blocked immediately.' : ''
    }`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setUpdatingId(restaurantId);
      await saasAPI.updateSubscription(restaurantId, { status: nextStatus });
      
      // Update local state immediately
      setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, status: nextStatus } : r));
      
      // Reload analytics metrics
      const statsData = await saasAPI.getStats();
      setStats(statsData);
    } catch (err) {
      console.error(err);
      alert('Failed to update subscription status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdatePlan = async (restaurantId, planType) => {
    try {
      setUpdatingId(restaurantId);
      await saasAPI.updateSubscription(restaurantId, { subscription_plan: planType });
      setRestaurants(prev => prev.map(r => r.id === restaurantId ? { ...r, subscription_plan: planType } : r));
      
      const statsData = await saasAPI.getStats();
      setStats(statsData);
    } catch (err) {
      console.error(err);
      alert('Failed to update plan type');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExtendValidity = async (restaurantId, days) => {
    const r = restaurants.find(res => res.id === restaurantId);
    if (!r) return;

    let baseDate = r.subscription_expires_at ? new Date(r.subscription_expires_at) : new Date();
    if (baseDate < new Date()) {
      baseDate = new Date(); // If expired, start from today
    }
    baseDate.setDate(baseDate.getDate() + days);

    try {
      setUpdatingId(restaurantId);
      await saasAPI.updateSubscription(restaurantId, { 
        subscription_expires_at: baseDate.toISOString(),
        status: 'ACTIVE' // Auto activate if validity extended
      });
      setRestaurants(prev => prev.map(res => res.id === restaurantId ? { ...res, subscription_expires_at: baseDate.toISOString(), status: 'ACTIVE' } : res));
      
      const statsData = await saasAPI.getStats();
      setStats(statsData);
    } catch (err) {
      console.error(err);
      alert('Failed to extend validity');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading SaaS Panel...</span>
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
            <i className="bi bi-clouds-fill text-primary me-2.5"></i>
            AI Waiter SaaS <span className="badge bg-warning text-dark ms-3 font-monospace animate-pulse" style={{ fontSize: '0.75rem' }}>Super Admin Control Panel</span>
          </span>
          <div className="d-flex align-items-center">
            <span className="text-light me-4 small d-none d-md-inline">
              <i className="bi bi-person-badge-fill me-1.5 text-secondary"></i> {user?.name}
            </span>
            <button className="btn btn-outline-danger btn-sm rounded-pill px-3.5" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i> Sign Out
            </button>
          </div>
        </div>
      </nav>

      {errorMessage && (
        <div className="container mt-4">
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Main SaaS Dashboard Content */}
      <div className="container-fluid p-4">
        
        {/* Row 1: Key Platform stats metrics */}
        {stats && (
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4 col-lg-3">
              <div className="card border-0 shadow-sm p-3.5 bg-white h-100" style={{ borderRadius: '16px' }}>
                <small className="text-muted d-block fw-bold mb-1">PLATFORM MONTHLY REVENUE</small>
                <h2 className="fw-extrabold mb-0 text-success font-monospace">₹{stats.monthlyRevenue.toLocaleString()}</h2>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm p-3.5 bg-white h-100" style={{ borderRadius: '16px' }}>
                <small className="text-muted d-block fw-bold mb-1">TOTAL TENANTS</small>
                <h3 className="fw-bold mb-0 text-primary font-monospace">{stats.totalRestaurants}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm p-3.5 bg-white h-100" style={{ borderRadius: '16px' }}>
                <small className="text-muted d-block fw-bold mb-1">ACTIVE SIGNUPS</small>
                <h3 className="fw-bold mb-0 text-success font-monospace">{stats.activeRestaurants}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="card border-0 shadow-sm p-3.5 bg-white h-100" style={{ borderRadius: '16px' }}>
                <small className="text-muted d-block fw-bold mb-1">AI REQUESTS LOGGED</small>
                <h3 className="fw-bold mb-0 text-info font-monospace">{stats.aiRequests}</h3>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-3">
              <div className="card border-0 shadow-sm p-3.5 bg-white h-100" style={{ borderRadius: '16px' }}>
                <small className="text-muted d-block fw-bold mb-1">TRIAL / EXPIRED / SUSPENDED</small>
                <h4 className="fw-bold mb-0 text-secondary font-monospace" style={{ fontSize: '1.25rem' }}>
                  {stats.trialRestaurants} Trial / {stats.expiredRestaurants} Exp / {stats.suspendedRestaurants} Susp
                </h4>
              </div>
            </div>
          </div>
        )}

        {/* Row 2: SaaS Tenants Management Table */}
        <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
          
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="fw-bold mb-0"><i className="bi bi-shop text-primary me-2"></i> Managed Restaurants & Subscriptions</h5>
            <button 
              className="btn btn-primary fw-semibold px-4 rounded-pill btn-sm"
              onClick={() => setShowCreateForm(prev => !prev)}
            >
              {showCreateForm ? 'Cancel Creation' : '➕ Register Restaurant'}
            </button>
          </div>

          {/* New Restaurant Form */}
          {showCreateForm && (
            <div className="card border-light bg-light p-4 mb-4 rounded-3 shadow-inner">
              <h6 className="fw-bold text-dark mb-3">Create Restaurant Owner Account</h6>
              <form onSubmit={handleCreateRestaurant}>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Restaurant Name *</label>
                    <input 
                      type="text" 
                      className="form-control bg-white" 
                      placeholder="e.g. Gourmet Palace" 
                      value={newRestName}
                      onChange={(e) => setNewRestName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Contact Phone</label>
                    <input 
                      type="text" 
                      className="form-control bg-white" 
                      placeholder="e.g. +91 98989 98989" 
                      value={newRestPhone}
                      onChange={(e) => setNewRestPhone(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Subscription Plan *</label>
                    <select 
                      className="form-select bg-white" 
                      value={newPlan}
                      onChange={(e) => setNewPlan(e.target.value)}
                    >
                      <option value="FREE">FREE Trial Plan (₹0)</option>
                      <option value="PRO">PRO Plan (₹2,499/mo)</option>
                      <option value="ENTERPRISE">ENTERPRISE Plan (₹9,999/mo)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Owner Full Name *</label>
                    <input 
                      type="text" 
                      className="form-control bg-white" 
                      placeholder="e.g. Rahul Sharma" 
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Owner Login Email *</label>
                    <input 
                      type="email" 
                      className="form-control bg-white" 
                      placeholder="e.g. owner@gourmet.com" 
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Owner Account Password *</label>
                    <input 
                      type="password" 
                      className="form-control bg-white" 
                      placeholder="Enter strong password" 
                      value={newOwnerPassword}
                      onChange={(e) => setNewOwnerPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Restaurant Address</label>
                    <textarea 
                      className="form-control bg-white" 
                      rows="2" 
                      placeholder="Enter location detail"
                      value={newRestAddress}
                      onChange={(e) => setNewRestAddress(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="col-12 text-end">
                    <button 
                      type="submit" 
                      className="btn btn-success fw-bold px-4"
                      disabled={formSubmitLoading}
                    >
                      {formSubmitLoading ? 'Registering Account...' : 'Register Tenant Owner'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Tenants List Table */}
          {restaurants.length === 0 ? (
            <p className="text-center text-muted py-4">No tenant restaurants registered on the platform yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover border-top align-middle">
                <thead>
                  <tr className="table-light">
                    <th>Restaurant</th>
                    <th>Owner Details</th>
                    <th>Current Plan</th>
                    <th>Expiry Date</th>
                    <th>Tenant Status</th>
                    <th className="text-end">Subscription Settings</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map(rest => {
                    const isSuspended = rest.status === 'SUSPENDED';
                    const isExpired = rest.status === 'EXPIRED';

                    return (
                      <tr key={rest.id}>
                        <td>
                          <div className="fw-bold text-dark">{rest.name}</div>
                          <small className="text-muted d-block"><i className="bi bi-telephone me-1"></i> {rest.phone || 'N/A'}</small>
                        </td>
                        <td>
                          <div className="small fw-semibold">{rest.owner_name || 'N/A'}</div>
                          <small className="text-muted">{rest.owner_email || 'N/A'}</small>
                        </td>
                        <td>
                          <span className={`badge ${
                            rest.subscription_plan === 'ENTERPRISE' ? 'bg-dark' :
                            rest.subscription_plan === 'PRO' ? 'bg-primary' : 'bg-secondary'
                          }`}>
                            {rest.subscription_plan}
                          </span>
                        </td>
                        <td>
                          <span className={`font-monospace small ${isExpired ? 'text-danger fw-bold' : ''}`}>
                            {rest.subscription_expires_at 
                              ? new Date(rest.subscription_expires_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
                              : 'Unlimited'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            rest.status === 'ACTIVE' ? 'bg-success' :
                            rest.status === 'SUSPENDED' ? 'bg-danger' :
                            rest.status === 'EXPIRED' ? 'bg-warning text-dark' : 'bg-secondary'
                          }`}>
                            {rest.status}
                          </span>
                        </td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2">
                            {/* Toggle Suspend / Active */}
                            <button 
                              className={`btn btn-sm ${isSuspended ? 'btn-success' : 'btn-danger'} py-1`}
                              style={{ minWidth: '85px' }}
                              disabled={updatingId === rest.id}
                              onClick={() => handleUpdateStatus(rest.id, rest.status)}
                            >
                              {isSuspended ? 'Activate' : 'Suspend'}
                            </button>

                            {/* Plan Select Actions Dropdown */}
                            <select 
                              className="form-select form-select-sm d-inline-block w-auto"
                              value={rest.subscription_plan}
                              disabled={updatingId === rest.id}
                              onChange={(e) => handleUpdatePlan(rest.id, e.target.value)}
                            >
                              <option value="FREE">FREE</option>
                              <option value="PRO">PRO</option>
                              <option value="ENTERPRISE">ENT</option>
                            </select>

                            {/* Validity extend buttons */}
                            <button 
                              className="btn btn-sm btn-outline-secondary py-1"
                              disabled={updatingId === rest.id}
                              onClick={() => handleExtendValidity(rest.id, 30)}
                            >
                              +30 Days
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-dark py-1"
                              disabled={updatingId === rest.id}
                              onClick={() => handleExtendValidity(rest.id, 365)}
                            >
                              +1 Year
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;
