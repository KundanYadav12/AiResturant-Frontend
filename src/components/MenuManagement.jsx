import React, { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';

const MenuManagement = ({ restaurantId }) => {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categorySubmitLoading, setCategorySubmitLoading] = useState(false);

  // Menu Item Form State
  const [itemId, setItemId] = useState(null); // null for create, ID for edit
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [itemSubmitLoading, setItemSubmitLoading] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('items'); // 'items' or 'categories'
  const [showItemForm, setShowItemForm] = useState(false);

  useEffect(() => {
    fetchMenuData();
  }, [restaurantId]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const cats = await menuAPI.getCategories(restaurantId);
      const items = await menuAPI.getMenuItems(restaurantId, true); // include inactive
      setCategories(cats);
      setMenuItems(items);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      setCategorySubmitLoading(true);
      await menuAPI.createCategory(newCategoryName.trim());
      setNewCategoryName('');
      await fetchMenuData();
    } catch (err) {
      console.error('Failed to create category:', err);
      alert('Error creating category. Please try again.');
    } finally {
      setCategorySubmitLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? This will delete all items under this category.')) return;

    try {
      await menuAPI.deleteCategory(id);
      await fetchMenuData();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert('Error deleting category.');
    }
  };

  const handleItemFormSubmit = async (e) => {
    e.preventDefault();
    if (!categoryId || !name || !price) {
      alert('Category, Name, and Price are required!');
      return;
    }

    const formData = new FormData();
    formData.append('categoryId', categoryId);
    formData.append('name', name);
    formData.append('price', price);
    formData.append('description', description);
    formData.append('isActive', isActive);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      setItemSubmitLoading(true);
      if (itemId) {
        // Edit Item
        await menuAPI.updateMenuItem(itemId, formData);
      } else {
        // Create Item
        await menuAPI.createMenuItem(formData);
      }

      // Reset form
      resetItemForm();
      await fetchMenuData();
    } catch (err) {
      console.error('Failed to save menu item:', err);
      alert('Error saving menu item. Please verify all details.');
    } finally {
      setItemSubmitLoading(false);
    }
  };

  const resetItemForm = () => {
    setItemId(null);
    setCategoryId(categories[0]?.id || '');
    setName('');
    setPrice('');
    setDescription('');
    setIsActive(true);
    setImageFile(null);
    setShowItemForm(false);
  };

  const handleEditClick = (item) => {
    setItemId(item.id);
    setCategoryId(item.category_id);
    setName(item.name);
    setPrice(item.price);
    setDescription(item.description || '');
    setIsActive(item.is_active === 1 || item.is_active === true);
    setImageFile(null);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await menuAPI.deleteMenuItem(id);
      await fetchMenuData();
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Error deleting menu item.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow border-0" style={{ borderRadius: '15px' }}>
      <div className="card-header bg-white border-0 pt-4">
        <ul className="nav nav-pills card-header-pills mb-2">
          <li className="nav-item">
            <button 
              className={`nav-link fw-bold px-4 py-2 ${activeTab === 'items' ? 'active' : ''}`}
              onClick={() => { setActiveTab('items'); resetItemForm(); }}
            >
              Menu Items
            </button>
          </li>
          <li className="nav-item ms-2">
            <button 
              className={`nav-link fw-bold px-4 py-2 ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => setActiveTab('categories')}
            >
              Categories
            </button>
          </li>
        </ul>
      </div>

      <div className="card-body p-4">
        {activeTab === 'categories' ? (
          <div>
            {/* Create Category Form */}
            <form onSubmit={handleCreateCategory} className="row g-3 mb-4 align-items-end">
              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-semibold">New Category Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Starters, Mains, Dessert"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-3">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2.5 fw-bold"
                  disabled={categorySubmitLoading}
                >
                  {categorySubmitLoading ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </form>

            {/* Categories List */}
            <div className="table-responsive">
              <table className="table table-hover border">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Category Name</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-muted">No categories created yet.</td>
                    </tr>
                  ) : (
                    categories.map((cat) => (
                      <tr key={cat.id} className="align-middle">
                        <td>{cat.id}</td>
                        <td className="fw-semibold">{cat.name}</td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-danger px-3 rounded-pill"
                            onClick={() => handleDeleteCategory(cat.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            {/* Add / Edit Menu Item Trigger */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Food Menu List</h5>
              {!showItemForm && (
                <button
                  className="btn btn-primary px-4 py-2 fw-bold"
                  onClick={() => {
                    setCategoryId(categories[0]?.id || '');
                    setShowItemForm(true);
                  }}
                  disabled={categories.length === 0}
                >
                  <i className="bi bi-plus-lg me-1"></i> Add Food Item
                </button>
              )}
            </div>

            {categories.length === 0 && (
              <div className="alert alert-warning">
                Please create at least one <strong>Category</strong> before adding menu items.
              </div>
            )}

            {/* Create/Edit Form Box */}
            {showItemForm && (
              <div className="bg-light p-4 rounded-3 border mb-4 shadow-sm">
                <h6 className="fw-bold text-primary mb-3">
                  {itemId ? 'Edit Menu Item' : 'Create New Menu Item'}
                </h6>
                <form onSubmit={handleItemFormSubmit} className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Category *</label>
                    <select
                      className="form-select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Food Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Garlic Naan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Price (INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control font-monospace"
                      placeholder="₹250.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label fw-semibold">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter brief description of taste, ingredients, portion size..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Food Image File</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                    />
                  </div>
                  <div className="col-md-12 d-flex align-items-center justify-content-between mt-3">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="isActiveSwitch"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="isActiveSwitch">
                        Food Item is Active (Visible on Menu)
                      </label>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary px-4 py-2"
                        onClick={resetItemForm}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 py-2"
                        disabled={itemSubmitLoading}
                      >
                        {itemSubmitLoading ? 'Saving...' : 'Save Item'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Menu Items Table */}
            <div className="table-responsive">
              <table className="table table-hover border">
                <thead className="table-light">
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">No items in the menu.</td>
                    </tr>
                  ) : (
                    menuItems.map((item) => (
                      <tr key={item.id} className="align-middle">
                        <td>
                          {item.image ? (
                            <img
                              src={`https://aiwaitercall.netlify.app/${item.image}`}
                              alt={item.name}
                              className="rounded-3"
                              style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="rounded-3 bg-secondary-subtle text-secondary d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
                              <i className="bi bi-image text-muted"></i>
                            </div>
                          )}
                        </td>
                        <td className="fw-semibold">{item.name}</td>
                        <td>
                          <span className="badge bg-light text-dark border">{item.category_name}</span>
                        </td>
                        <td className="font-monospace fw-bold text-primary">₹{parseFloat(item.price).toFixed(2)}</td>
                        <td>
                          {item.is_active === 1 || item.is_active === true ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">Active</span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill">Inactive</span>
                          )}
                        </td>
                        <td className="small text-muted" style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.description || '-'}
                        </td>
                        <td className="text-end">
                          <button
                            className="btn btn-sm btn-outline-primary px-3 rounded-pill me-2"
                            onClick={() => handleEditClick(item)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger px-3 rounded-pill"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManagement;
