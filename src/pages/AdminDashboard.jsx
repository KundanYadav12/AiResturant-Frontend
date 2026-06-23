import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MenuManagement from '../components/MenuManagement';
import { dashboardAPI, authAPI, menuAPI } from '../services/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'menu', 'customizations', 'ingredients', 'faqs', 'knowledge', 'tables', 'subscription'
  const [analytics, setAnalytics] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState('My Restaurant');
  const [restaurantDetails, setRestaurantDetails] = useState(null);

  // Table creation state
  const [newTableNumber, setNewTableNumber] = useState('');
  const [tableSubmitLoading, setTableSubmitLoading] = useState(false);

  // Ingredients tab states
  const [ingredients, setIngredients] = useState([]);
  const [newIngredientName, setNewIngredientName] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [itemIngredients, setItemIngredients] = useState([]); // Array of { ingredient_id, is_allergen, name }

  // Customizations tab states
  const [customItemSelectionId, setCustomItemSelectionId] = useState('');
  const [itemCustomizations, setItemCustomizations] = useState([]);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomPrice, setNewCustomPrice] = useState('0');

  // FAQs tab states
  const [faqs, setFaqs] = useState([]);
  const [newFAQQuestion, setNewFAQQuestion] = useState('');
  const [newFAQAnswer, setNewFAQAnswer] = useState('');
  const [editingFAQId, setEditingFAQId] = useState(null);
  const [editingFAQQuestion, setEditingFAQQuestion] = useState('');
  const [editingFAQAnswer, setEditingFAQAnswer] = useState('');

  // AI Knowledge states
  const [knowledgeText, setKnowledgeText] = useState('');
  const [knowledgeSaveLoading, setKnowledgeSaveLoading] = useState(false);
  const [knowledgeSaveSuccess, setKnowledgeSaveSuccess] = useState(false);

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
      setRestaurantDetails(restaurant);
    }

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [report, list] = await Promise.all([
        dashboardAPI.getAnalytics(),
        dashboardAPI.getTables()
      ]);
      setAnalytics(report);
      setTables(list);

      // Preload menu items and ingredients for mappings
      if (user?.restaurantId) {
        const items = await menuAPI.getMenuItems(user.restaurantId, true);
        setMenuItems(items);
        
        const ing = await menuAPI.getIngredients();
        setIngredients(ing);
        
        const faqList = await menuAPI.getFAQs();
        setFaqs(faqList);

        const knowledge = await menuAPI.getGeneralKnowledge();
        if (knowledge) {
          setKnowledgeText(knowledge.content);
        }
      }
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
    if (!window.confirm('Are you sure you want to delete this table? The QR ordering link will be deactivated.')) return;

    try {
      await dashboardAPI.deleteTable(id);
      const list = await dashboardAPI.getTables();
      setTables(list);
    } catch (err) {
      console.error('Failed to delete table:', err);
      alert('Error deleting table.');
    }
  };

  // --- INGREDIENTS HANDLERS ---
  const handleCreateIngredient = async (e) => {
    e.preventDefault();
    if (!newIngredientName.trim()) return;
    try {
      const data = await menuAPI.createIngredient(newIngredientName.trim());
      setIngredients(prev => [...prev, data]);
      setNewIngredientName('');
    } catch (err) {
      console.error(err);
      alert('Failed to add ingredient');
    }
  };

  const handleDeleteIngredient = async (id) => {
    if (!window.confirm('Delete this ingredient? This will unlink it from all menu items.')) return;
    try {
      await menuAPI.deleteIngredient(id);
      setIngredients(prev => prev.filter(i => i.id !== id));
      if (selectedMenuItemId) {
        // Refresh mapping list
        fetchItemIngredients(selectedMenuItemId);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete ingredient');
    }
  };

  const fetchItemIngredients = async (itemId) => {
    try {
      const data = await menuAPI.getMenuItemIngredients(itemId);
      setItemIngredients(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMenuItemChange = (e) => {
    const id = e.target.value;
    setSelectedMenuItemId(id);
    if (id) {
      fetchItemIngredients(id);
    } else {
      setItemIngredients([]);
    }
  };

  const handleToggleIngredientLink = (ingredientId, checked) => {
    setItemIngredients(prev => {
      const exists = prev.some(i => i.ingredient_id === ingredientId);
      if (exists) {
        if (!checked) {
          // Remove link
          return prev.filter(i => i.ingredient_id !== ingredientId);
        }
        return prev;
      }
      // Add link (not allergen by default)
      const ingObj = ingredients.find(i => i.id === ingredientId);
      return [...prev, {
        ingredient_id: ingredientId,
        is_allergen: 0,
        name: ingObj ? ingObj.name : ''
      }];
    });
  };

  const handleToggleAllergen = (ingredientId, checked) => {
    setItemIngredients(prev => 
      prev.map(i => i.ingredient_id === ingredientId ? { ...i, is_allergen: checked ? 1 : 0 } : i)
    );
  };

  const handleSaveIngredientsMapping = async () => {
    if (!selectedMenuItemId) return;
    try {
      const links = itemIngredients.map(i => ({
        ingredientId: i.ingredient_id,
        isAllergen: i.is_allergen ? true : false
      }));
      await menuAPI.linkMenuItemIngredients(selectedMenuItemId, links);
      alert('Ingredients mapping saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save mapping');
    }
  };

  // --- CUSTOMIZATIONS HANDLERS ---
  const fetchItemCustomizations = async (itemId) => {
    try {
      const data = await menuAPI.getCustomizations(itemId);
      setItemCustomizations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCustomItemChange = (e) => {
    const id = e.target.value;
    setCustomItemSelectionId(id);
    if (id) {
      fetchItemCustomizations(id);
    } else {
      setItemCustomizations([]);
    }
  };

  const handleAddCustomization = async (e) => {
    e.preventDefault();
    if (!customItemSelectionId || !newCustomName.trim()) return;
    try {
      const data = await menuAPI.createCustomization(
        customItemSelectionId, 
        newCustomName.trim(), 
        parseFloat(newCustomPrice || 0)
      );
      setItemCustomizations(prev => [...prev, data]);
      setNewCustomName('');
      setNewCustomPrice('0');
    } catch (err) {
      console.error(err);
      alert('Failed to create customization');
    }
  };

  const handleDeleteCustomization = async (id) => {
    try {
      await menuAPI.deleteCustomization(id);
      setItemCustomizations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete customization');
    }
  };

  // --- FAQ HANDLERS ---
  const handleAddFAQ = async (e) => {
    e.preventDefault();
    if (!newFAQQuestion.trim() || !newFAQAnswer.trim()) return;
    try {
      const data = await menuAPI.createFAQ(newFAQQuestion.trim(), newFAQAnswer.trim());
      setFaqs(prev => [data, ...prev]);
      setNewFAQQuestion('');
      setNewFAQAnswer('');
    } catch (err) {
      console.error(err);
      alert('Failed to add FAQ');
    }
  };

  const handleDeleteFAQ = async (id) => {
    if (!window.confirm('Delete this FAQ?')) return;
    try {
      await menuAPI.deleteFAQ(id);
      setFaqs(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete FAQ');
    }
  };

  const startEditFAQ = (faq) => {
    setEditingFAQId(faq.id);
    setEditingFAQQuestion(faq.question);
    setEditingFAQAnswer(faq.answer);
  };

  const handleUpdateFAQ = async (e) => {
    e.preventDefault();
    try {
      await menuAPI.updateFAQ(editingFAQId, editingFAQQuestion, editingFAQAnswer);
      setFaqs(prev => prev.map(f => f.id === editingFAQId ? { ...f, question: editingFAQQuestion, answer: editingFAQAnswer } : f));
      setEditingFAQId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update FAQ');
    }
  };

  // --- KNOWLEDGE BASE HANDLERS ---
  const handleSaveKnowledge = async () => {
    try {
      setKnowledgeSaveLoading(true);
      setKnowledgeSaveSuccess(false);
      await menuAPI.saveGeneralKnowledge(knowledgeText.trim());
      setKnowledgeSaveSuccess(true);
      setTimeout(() => setKnowledgeSaveSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to save general knowledge guidelines.');
    } finally {
      setKnowledgeSaveLoading(false);
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
            {restaurantName} 
            <span className="badge bg-danger ms-3 font-monospace" style={{ fontSize: '0.75rem' }}>Owner Control Panel</span>
          </span>
          <div className="d-flex align-items-center">
            <span className="text-light me-4 small d-none d-md-inline">
              <i className="bi bi-person-badge-fill me-1.5 text-secondary"></i> {user?.name}
            </span>
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
          
          {/* Sidebar Navigation (Col-2) */}
          <div className="col-12 col-lg-3 col-xl-2">
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
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'customizations' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('customizations')}
                  >
                    <i className="bi bi-sliders me-2.5"></i> Customizations
                  </button>
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'ingredients' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('ingredients')}
                  >
                    <i className="bi bi-shield-exclamation me-2.5"></i> Ingredients/Allergens
                  </button>
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'faqs' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('faqs')}
                  >
                    <i className="bi bi-chat-square-text me-2.5"></i> FAQ Knowledge
                  </button>
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'knowledge' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('knowledge')}
                  >
                    <i className="bi bi-robot me-2.5"></i> AI General Guidelines
                  </button>
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'tables' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('tables')}
                  >
                    <i className="bi bi-qr-code-scan me-2.5"></i> Tables & QRs
                  </button>
                  <button 
                    className={`nav-link text-start fw-semibold py-2.5 px-3 rounded-3 ${activeTab === 'subscription' ? 'active' : 'text-dark hover-bg-light'}`}
                    onClick={() => setActiveTab('subscription')}
                  >
                    <i className="bi bi-credit-card me-2.5"></i> Subscription Plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Core Panel Content (Col-10) */}
          <div className="col-12 col-lg-9 col-xl-10">
            
            {/* 1. Analytics & Sales */}
            {activeTab === 'analytics' && analytics && (
              <div>
                <div className="row g-3 mb-4">
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>TODAY'S ORDERS</small>
                      <h3 className="fw-bold mb-0 font-monospace text-primary">{analytics.today.orders}</h3>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>TODAY'S REVENUE</small>
                      <h3 className="fw-bold mb-0 font-monospace text-success">₹{analytics.today.revenue.toFixed(2)}</h3>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>WEEKLY SALES</small>
                      <h3 className="fw-bold mb-0 font-monospace text-info">₹{analytics.weekly.revenue.toFixed(2)}</h3>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="card border-0 shadow-sm p-3 bg-white" style={{ borderRadius: '16px' }}>
                      <small className="text-muted d-block fw-semibold" style={{ fontSize: '0.75rem' }}>MONTHLY SALES</small>
                      <h3 className="fw-bold mb-0 font-monospace text-dark">₹{analytics.monthly.revenue.toFixed(2)}</h3>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
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
                              <tr><td colSpan="3" className="text-center py-4 text-muted">No sales logged.</td></tr>
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

                  <div className="col-12 col-md-6">
                    <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
                      <h5 className="fw-bold mb-3"><i className="bi bi-grid-3x3-gap text-primary me-2"></i> Top Performing Tables</h5>
                      <div className="table-responsive">
                        <table className="table table-hover border-top">
                          <thead>
                            <tr>
                              <th>Table</th>
                              <th>Orders Placed</th>
                              <th className="text-end">Revenue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.topTables.length === 0 ? (
                              <tr><td colSpan="3" className="text-center py-4 text-muted">No table orders served yet.</td></tr>
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

            {/* 2. Menu Management */}
            {activeTab === 'menu' && (
              <MenuManagement restaurantId={user?.restaurantId} />
            )}

            {/* 3. Customizations */}
            {activeTab === 'customizations' && (
              <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
                <h5 className="fw-bold mb-3">Item Customizations Manager</h5>
                <p className="text-muted small">Configure additions (like Extra Cheese, Extra Ghee) and price adjustments for each dish on the menu.</p>
                
                <div className="row mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Select Menu Item</label>
                    <select 
                      className="form-select" 
                      value={customItemSelectionId} 
                      onChange={handleCustomItemChange}
                    >
                      <option value="">-- Select an Item --</option>
                      {menuItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name} (₹{item.price})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {customItemSelectionId && (
                  <div className="row g-4">
                    {/* Add Customization Form */}
                    <div className="col-md-5">
                      <div className="card border-light p-3 bg-light rounded-3">
                        <h6 className="fw-bold mb-3">Add Customization Option</h6>
                        <form onSubmit={handleAddCustomization}>
                          <div className="mb-3">
                            <label className="form-label small fw-semibold">Customization Name</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              placeholder="e.g. Extra Cheese, Double Spicy" 
                              value={newCustomName}
                              onChange={(e) => setNewCustomName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label small fw-semibold">Additional Price (₹)</label>
                            <input 
                              type="number" 
                              step="0.01" 
                              className="form-control font-monospace" 
                              value={newCustomPrice}
                              onChange={(e) => setNewCustomPrice(e.target.value)}
                              required
                            />
                          </div>
                          <button type="submit" className="btn btn-primary btn-sm w-100 py-2 fw-semibold">
                            Add Option
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Active Options Table */}
                    <div className="col-md-7">
                      <h6 className="fw-bold mb-3">Active Customizations</h6>
                      {itemCustomizations.length === 0 ? (
                        <p className="text-muted small">No customizations defined for this item yet. Use the form to add some.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover border">
                            <thead>
                              <tr>
                                <th>Option Name</th>
                                <th>Price Addition</th>
                                <th className="text-end">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {itemCustomizations.map(c => (
                                <tr key={c.id}>
                                  <td className="fw-semibold">{c.name}</td>
                                  <td className="font-monospace">+₹{parseFloat(c.price).toFixed(2)}</td>
                                  <td className="text-end">
                                    <button 
                                      className="btn btn-link text-danger p-0 fw-semibold btn-sm"
                                      onClick={() => handleDeleteCustomization(c.id)}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Ingredients & Allergens */}
            {activeTab === 'ingredients' && (
              <div className="row g-4">
                {/* Ingredients definition list */}
                <div className="col-12 col-md-5">
                  <div className="card border-0 shadow-sm p-4 bg-white h-100" style={{ borderRadius: '16px' }}>
                    <h5 className="fw-bold mb-3">Kitchen Ingredients List</h5>
                    <form onSubmit={handleCreateIngredient} className="d-flex gap-2 mb-4">
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Ingredient name (e.g. Nuts, Garlic)" 
                        value={newIngredientName}
                        onChange={(e) => setNewIngredientName(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn btn-primary fw-bold px-3">Add</button>
                    </form>

                    <div className="list-group overflow-y-auto" style={{ maxHeight: '420px' }}>
                      {ingredients.length === 0 ? (
                        <p className="text-center text-muted small py-4">No ingredients defined.</p>
                      ) : (
                        ingredients.map(ing => (
                          <div key={ing.id} className="list-group-item d-flex justify-content-between align-items-center py-2 px-3">
                            <span className="fw-semibold text-dark small">{ing.name}</span>
                            <button 
                              className="btn btn-outline-danger btn-sm border-0 p-0 px-2"
                              onClick={() => handleDeleteIngredient(ing.id)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Linking Mapping Section */}
                <div className="col-12 col-md-7">
                  <div className="card border-0 shadow-sm p-4 bg-white h-100" style={{ borderRadius: '16px' }}>
                    <h5 className="fw-bold mb-3">Map Ingredients & Allergens</h5>
                    <p className="text-muted small">Select a dish to specify which ingredients it contains, and flag any known food allergens for the AI Waiter.</p>

                    <div className="mb-4">
                      <label className="form-label fw-semibold">Select Menu Item</label>
                      <select 
                        className="form-select" 
                        value={selectedMenuItemId} 
                        onChange={handleMenuItemChange}
                      >
                        <option value="">-- Select an Item --</option>
                        {menuItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>

                    {selectedMenuItemId && (
                      <div>
                        <h6 className="fw-bold mb-3">Associate Ingredients</h6>
                        {ingredients.length === 0 ? (
                          <p className="text-muted small">Please create ingredients first in the left panel.</p>
                        ) : (
                          <div className="overflow-y-auto mb-4" style={{ maxHeight: '350px' }}>
                            <table className="table border">
                              <thead>
                                <tr>
                                  <th style={{ width: '40%' }}>Ingredient</th>
                                  <th style={{ width: '30%' }}>Included</th>
                                  <th style={{ width: '30%' }}>Mark Allergen</th>
                                </tr>
                              </thead>
                              <tbody>
                                {ingredients.map(ing => {
                                  const mapping = itemIngredients.find(i => i.ingredient_id === ing.id);
                                  const isLinked = !!mapping;
                                  const isAllergen = mapping ? !!mapping.is_allergen : false;

                                  return (
                                    <tr key={ing.id}>
                                      <td className="small fw-semibold">{ing.name}</td>
                                      <td>
                                        <input 
                                          type="checkbox" 
                                          className="form-check-input"
                                          checked={isLinked}
                                          onChange={(e) => handleToggleIngredientLink(ing.id, e.target.checked)}
                                        />
                                      </td>
                                      <td>
                                        <input 
                                          type="checkbox" 
                                          className="form-check-input"
                                          checked={isAllergen}
                                          disabled={!isLinked}
                                          onChange={(e) => handleToggleAllergen(ing.id, e.target.checked)}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        <button 
                          className="btn btn-success fw-bold px-4 w-100"
                          onClick={handleSaveIngredientsMapping}
                          disabled={ingredients.length === 0}
                        >
                          Save Ingredients Mapping
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. FAQs */}
            {activeTab === 'faqs' && (
              <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
                <h5 className="fw-bold mb-3">FAQ Knowledge Management</h5>
                <p className="text-muted small">Add answers to common customer questions. The AI Waiter scans these FAQs before replying to help customers accurately.</p>

                {/* Add FAQ form */}
                {editingFAQId === null ? (
                  <form onSubmit={handleAddFAQ} className="bg-light p-3 rounded-3 mb-4 border">
                    <h6 className="fw-bold mb-3">Add FAQ Entry</h6>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Customer Question</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Do you have Jain food? Are your dishes spicy?" 
                        value={newFAQQuestion}
                        onChange={(e) => setNewFAQQuestion(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Restaurant Answer</label>
                      <textarea 
                        className="form-control" 
                        rows="2" 
                        placeholder="e.g. Yes, we can make Dal Makhani and Paneer Tikka without onion/garlic on request." 
                        value={newFAQAnswer}
                        onChange={(e) => setNewFAQAnswer(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm fw-bold px-4">Add FAQ Entry</button>
                  </form>
                ) : (
                  <form onSubmit={handleUpdateFAQ} className="bg-warning-subtle p-3 rounded-3 mb-4 border border-warning">
                    <h6 className="fw-bold text-warning-emphasis mb-3">Edit FAQ Entry</h6>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Customer Question</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={editingFAQQuestion}
                        onChange={(e) => setEditingFAQQuestion(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-semibold">Restaurant Answer</label>
                      <textarea 
                        className="form-control" 
                        rows="2" 
                        value={editingFAQAnswer}
                        onChange={(e) => setEditingFAQAnswer(e.target.value)}
                        required
                      ></textarea>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-warning btn-sm fw-bold px-4">Save Changes</button>
                      <button type="button" className="btn btn-outline-secondary btn-sm fw-bold px-3" onClick={() => setEditingFAQId(null)}>Cancel</button>
                    </div>
                  </form>
                )}

                {/* FAQ List */}
                <h6 className="fw-bold mb-3">Registered FAQs</h6>
                {faqs.length === 0 ? (
                  <p className="text-muted small">No FAQs added yet.</p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {faqs.map(faq => (
                      <div key={faq.id} className="card border-light shadow-sm p-3 rounded-3">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="fw-bold mb-0 text-dark">Q: {faq.question}</h6>
                          <div className="d-flex gap-2">
                            <button className="btn btn-outline-primary btn-sm rounded-circle py-0 px-2" onClick={() => startEditFAQ(faq)}><i className="bi bi-pencil-fill" style={{ fontSize: '0.85rem' }}></i></button>
                            <button className="btn btn-outline-danger btn-sm rounded-circle py-0 px-2" onClick={() => handleDeleteFAQ(faq.id)}><i className="bi bi-trash-fill" style={{ fontSize: '0.85rem' }}></i></button>
                          </div>
                        </div>
                        <p className="text-secondary mb-0 small">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. AI General Guidelines */}
            {activeTab === 'knowledge' && (
              <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
                <h5 className="fw-bold mb-3">AI Waiter - General Guidelines</h5>
                <p className="text-muted small">Provide general restaurant knowledge (e.g. kitchen timings, clean water warnings, parking info, chef recipes guidelines). The AI Waiter reads these instructions before answering customers.</p>
                
                <div className="mb-4">
                  <textarea 
                    className="form-control font-monospace" 
                    rows="10" 
                    style={{ fontSize: '0.9rem', lineHeight: '1.5' }}
                    placeholder="Enter guidelines, recipe notes, kitchen policies, or custom waiting rules here..."
                    value={knowledgeText}
                    onChange={(e) => setKnowledgeText(e.target.value)}
                  ></textarea>
                </div>

                {knowledgeSaveSuccess && (
                  <div className="alert alert-success py-2 text-center mb-3">
                    <small className="fw-bold"><i className="bi bi-check-circle-fill me-1"></i> AI Guidelines saved and synchronized successfully!</small>
                  </div>
                )}

                <button 
                  className="btn btn-success fw-bold px-4"
                  onClick={handleSaveKnowledge}
                  disabled={knowledgeSaveLoading}
                >
                  {knowledgeSaveLoading ? 'Saving Guidelines...' : 'Synchronize AI Knowledge Base'}
                </button>
              </div>
            )}

            {/* 7. Tables & QR Codes */}
            {activeTab === 'tables' && (
              <div>
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

                <div className="row g-4">
                  {tables.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted">
                      <i className="bi bi-qr-code display-4 d-block mb-3 opacity-50"></i>
                      <p>No dining tables configured. Add a table to generate its unique secure QR code!</p>
                    </div>
                  ) : (
                    tables.map((table) => {
                      const absoluteQrUrl = `${window.location.origin}/order/${table.table_token}`;
                      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(absoluteQrUrl)}`;

                      return (
                        <div key={table.id} className="col-6 col-sm-4 col-md-3">
                          <div className="card border-0 shadow-sm p-3 bg-white text-center h-100 d-flex flex-column align-items-center justify-content-between" style={{ borderRadius: '16px' }}>
                            <div className="fw-bold text-dark mb-2">{table.table_number}</div>
                            
                            <div className="bg-light p-2 rounded border mb-3">
                              <img 
                                src={qrCodeImageUrl} 
                                alt={`QR Code for Table ${table.table_number}`} 
                                className="img-fluid"
                                style={{ width: '130px', height: '130px', objectFit: 'contain' }}
                              />
                            </div>

                            <div className="d-flex flex-column gap-2 w-100">
                              <a 
                                href={`/order/${table.table_token}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary rounded-pill fw-semibold py-1.5"
                              >
                                <i className="bi bi-box-arrow-up-right me-1"></i> Scan Table QR
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

            {/* 8. Subscription Plan */}
            {activeTab === 'subscription' && restaurantDetails && (
              <div className="card border-0 shadow-sm p-4 bg-white" style={{ borderRadius: '16px' }}>
                <h5 className="fw-bold mb-3"><i className="bi bi-award text-primary me-2"></i> Subscription Status</h5>
                <p className="text-muted small">Manage your current billing cycle, check features included in your active plan, or update configurations.</p>
                
                <div className="row g-3 mt-2 mb-4">
                  <div className="col-md-4">
                    <div className="card bg-light border p-3 rounded-3 text-center">
                      <small className="text-muted fw-bold d-block mb-1">ACTIVE PLAN</small>
                      <h4 className="fw-bold text-dark mb-0">{restaurantDetails.subscription_plan || 'TRIAL'} PLAN</h4>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light border p-3 rounded-3 text-center">
                      <small className="text-muted fw-bold d-block mb-1">STATUS</small>
                      <h4 className="fw-bold text-success mb-0">{restaurantDetails.status || 'ACTIVE'}</h4>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card bg-light border p-3 rounded-3 text-center">
                      <small className="text-muted fw-bold d-block mb-1">VALIDITY EXPIRES ON</small>
                      <h4 className="fw-bold text-primary mb-0" style={{ fontSize: '1.25rem' }}>
                        {restaurantDetails.subscription_expires_at 
                          ? new Date(restaurantDetails.subscription_expires_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
                          : 'Unlimited Trial'}
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="card border-light bg-light-subtle p-3 rounded-3">
                  <h6 className="fw-bold mb-3"><i className="bi bi-check2-circle text-success me-2"></i> Included Features</h6>
                  <div className="row g-2">
                    <div className="col-md-6 d-flex align-items-center gap-2 mb-2"><i className="bi bi-check-lg text-success"></i><span>Unlimited Conversational AI orders</span></div>
                    <div className="col-md-6 d-flex align-items-center gap-2 mb-2"><i className="bi bi-check-lg text-success"></i><span>Voice & Speech Ordering System</span></div>
                    <div className="col-md-6 d-flex align-items-center gap-2 mb-2"><i className="bi bi-check-lg text-success"></i><span>Multi-Tenant Table QR Tokens isolation</span></div>
                    <div className="col-md-6 d-flex align-items-center gap-2 mb-2"><i className="bi bi-check-lg text-success"></i><span>Manager Real-time Sockets Dashboard</span></div>
                    <div className="col-md-6 d-flex align-items-center gap-2 mb-2"><i className="bi bi-check-lg text-success"></i><span>Allergen & Custom Recipe RAG Knowledge Base</span></div>
                    <div className="col-md-6 d-flex align-items-center gap-2 mb-2"><i className="bi bi-check-lg text-success"></i><span>Live Waiter Table Requests tracking</span></div>
                  </div>
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
