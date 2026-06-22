import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuManagement from '../components/MenuManagement';
import { dashboardAPI, authAPI } from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'menu', 'tables'
  const [analytics, setAnalytics] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');

  // Table creation state
  const [newTableNumber, setNewTableNumber] = useState('');
  const [tableSubmitLoading, setTableSubmitLoading] = useState(false);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const restaurant = JSON.parse(localStorage.getItem('restaurant'));

  useEffect(() => {
    // OWNER Role Check
    if (!localStorage.getItem('token') || !user || user.role !== 'OWNER') {
      navigate('/login');
      return;
    }

    if (restaurant) {
      setRestaurantName(restaurant.name);
    }

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const report = await dashboardAPI.getAnalytics();
      const list = await dashboardAPI.getTables();
      setAnalytics(report);
      setTables(list);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;

    try {
      setTableSubmitLoading(true);
      await dashboardAPI.createTable(newTableNumber.trim());
      setNewTableNumber('');
      // Reload table list and analytics reports
      const list = await dashboardAPI.getTables();
      setTables(list);
    } catch (err) {
      console.error('Failed to create table:', err);
      alert('Error creating table.');
    } finally {
      setTableSubmitLoading(false);
    }
  };

  const handleDeleteTable = async (id) => {
    if (!window.confirm('Are you sure you want to delete this table? Orders on this table will also be deleted.')) return;

    try {
      await dashboardAPI.deleteTable(id);
      const list = await dashboardAPI.getTables();
      setTables(list);
    } catch (err) {
      console.error('Failed to delete table:', err);
      alert('Error deleting table.');
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
          <span className="visually-hidden">Loading Admin Panel...</span>
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
            <i className="bi bi-gear-fill text-primary me-2.5"></i>
            {restaurantName} <span className="badge bg-danger ms-3 font-monospace" style={{ fontSize: '0.75rem' }}>Owner Control Panel</span>
          </span>
          <div className="d-flex align-items-center">
            <span className="text-light me-4 small d-none d-md-inline"><i className="bi bi-person-badge-fill me-1.5 text-secondary"></i> {user?.name}</span>
            <button className="btn btn-outline-info btn-sm rounded-pill px-3.5 me-2" onClick={() => navigate('/manager')}>
              <i className="bi bi-speedometer2 me-1"></i> Live Dashboard
            </button>
            <button className="btn btn-outline-danger btn-sm rounded-pill px-3.5" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i> Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Admin Panel Layout */}
      <div className="container-fluid p-4">
        <div className="row g-4">
          
          {/* Sidebar Navigation */}
          <div className="col-12 col-lg-2">
            <div className="card shadow-sm border-0 mb-3" style={{ borderRadius: '15px' }}>
              <div className="card-body p-3">
                <div className="nav flex-column nav-pills gap-1">
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'analytics' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('analytics')}
                  >
                    <i className="bi bi-graph-up-arrow me-2.5"></i> Reports & Sales
                  </button>
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'menu' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('menu')}
                  >
                    <i className="bi bi-egg-fried me-2.5"></i> Menu Manager
                  </button>
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'tables' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('tables')}
                  >
                    <i className="bi bi-qr-code-scan me-2.5"></i> Tables & QR Codes
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Core Panel Content */}
          <div className="col-12 col-lg-10">
            {activeTab === 'analytics' && analytics && (
              <div>
                {/* Metric Summary Cards */}
                <div className="row g-3 mb-4">
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <div className="rounded-circle bg-warning-subtle text-warning p-2.5 me-3">
                          <i className="bi bi-receipt-cutoff fs-4"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>TODAY'S ORDERS</small>
                          <h4 className="fw-bold mb-0 font-monospace">{analytics.today.orders}</h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <div className="rounded-circle bg-success-subtle text-success p-2.5 me-3">
                          <i className="bi bi-currency-rupee fs-4"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>TODAY'S REVENUE</small>
                          <h4 className="fw-bold mb-0 font-monospace">₹{analytics.today.revenue.toFixed(2)}</h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <div className="rounded-circle bg-primary-subtle text-primary p-2.5 me-3">
                          <i className="bi bi-calendar-event fs-4"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>WEEKLY REVENUE</small>
                          <h4 className="fw-bold mb-0 font-monospace">₹{analytics.weekly.revenue.toFixed(2)}</h4>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <div className="d-flex align-items-center mb-2">
                        <div className="rounded-circle bg-info-subtle text-info p-2.5 me-3">
                          <i className="bi bi-calendar-month fs-4"></i>
                        </div>
                        <div>
                          <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>MONTHLY REVENUE</small>
                          <h4 className="fw-bold mb-0 font-monospace">₹{analytics.monthly.revenue.toFixed(2)}</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub reports tables */}
                <div className="row g-4">
                  {/* Top Selling Items */}
                  <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
                      <h5 className="fw-bold mb-3"><i className="bi bi-award text-warning me-2"></i> Most Ordered Items</h5>
                      <div className="table-responsive">
                        <table className="table table-hover border-top">
                          <thead>
                            <tr>
                              <th>Food Item</th>
                              <th>Qty Sold</th>
                              <th className="text-end">Sales Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.topItems.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="text-center py-4 text-muted">No sales logged yet.</td>
                              </tr>
                            ) : (
                              analytics.topItems.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="fw-semibold">{item.item_name}</td>
                                  <td className="font-monospace fw-bold">{item.totalQty}</td>
                                  <td className="font-monospace fw-bold text-end">₹{parseFloat(item.totalSales).toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Top Tables */}
                  <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
                      <h5 className="fw-bold mb-3"><i className="bi bi-grid-3x3-gap text-primary me-2"></i> Top Performing Tables</h5>
                      <div className="table-responsive">
                        <table className="table table-hover border-top">
                          <thead>
                            <tr>
                              <th>Table</th>
                              <th>Orders Placed</th>
                              <th className="text-end">Revenue contribution</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.topTables.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="text-center py-4 text-muted">No table orders served yet.</td>
                              </tr>
                            ) : (
                              analytics.topTables.map((t, idx) => (
                                <tr key={idx}>
                                  <td className="fw-semibold">Table {t.table_number}</td>
                                  <td className="font-monospace fw-bold">{t.orderCount}</td>
                                  <td className="font-monospace fw-bold text-end">₹{parseFloat(t.totalRevenue).toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'menu' && (
              <MenuManagement restaurantId={user?.restaurantId} />
            )}

            {activeTab === 'tables' && (
              <div>
                {/* Create Table Form */}
                <div className="card border-0 shadow-sm p-4 bg-white mb-4" style={{ borderRadius: '16px' }}>
                  <h5 className="fw-bold mb-3">Add Dining Table</h5>
                  <form onSubmit={handleCreateTable} className="row g-3 align-items-end">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Table Name / Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Table 1, Table A"
                        value={newTableNumber}
                        onChange={(e) => setNewTableNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-3">
                      <button
                        type="submit"
                        className="btn btn-primary w-100 py-2.5 fw-bold"
                        disabled={tableSubmitLoading}
                      >
                        {tableSubmitLoading ? 'Saving...' : 'Add Table'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Tables Grid with Printable QR Codes */}
                <div className="row g-4">
                  {tables.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted">
                      <i className="bi bi-qr-code display-4 d-block mb-3 opacity-50"></i>
                      <p>No dining tables configured. Add a table to generate its unique QR ordering code!</p>
                    </div>
                  ) : (
                    tables.map((table) => {
                      const absoluteQrUrl = `${window.location.origin}${table.qr_code}`;
                      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(absoluteQrUrl)}`;

                      return (
                        <div key={table.id} className="col-6 col-sm-4 col-md-3">
                          <div className="card border-0 shadow-sm p-3 bg-white text-center h-100 d-flex flex-column align-items-center justify-content-between" style={{ borderRadius: '16px' }}>
                            <div className="fw-bold text-dark mb-2">Table {table.table_number}</div>
                            
                            {/* QR Image Container */}
                            <div className="bg-light p-2 rounded border mb-3">
                              <img 
                                src={qrCodeImageUrl} 
                                alt={`QR Code for Table ${table.table_number}`} 
                                className="img-fluid"
                                style={{ width: '130px', height: '130px', objectFit: 'contain' }}
                              />
                            </div>

                            {/* Actions */}
                            <div className="d-flex flex-column gap-2 w-100">
                              <a 
                                href={table.qr_code} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary rounded-pill fw-semibold py-1.5"
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i> Scan Mock Link
                              </a>
                              <button
                                className="btn btn-sm btn-outline-danger rounded-pill fw-semibold py-1.5"
                                onClick={() => handleDeleteTable(table.id)}
                              >
                                <i className="bi bi-trash me-1"></i> Remove Table
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        .hover-bg-light:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
