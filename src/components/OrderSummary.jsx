import React, { useState } from 'react';

const OrderSummary = ({ cart, onUpdateQty, onRemoveItem, onSubmitOrder, isSubmitting, tableNumber }) => {
  const [notes, setNotes] = useState('');

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);
  };

  const handlePlaceOrder = () => {
    onSubmitOrder(notes);
  };

  return (
    <div id="order-summary-section" className="card shadow-lg border-0" style={{ borderRadius: '20px', overflow: 'hidden' }}>
      <div className="card-header bg-gradient bg-dark text-white p-3">
        <h6 className="mb-0 fw-bold d-flex justify-content-between align-items-center">
          <span><i className="bi bi-cart3 me-2"></i> Order Summary</span>
          <span className="badge bg-primary fs-7">Table {tableNumber || 'N/A'}</span>
        </h6>
      </div>

      <div className="card-body p-3">
        {cart.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="bi bi-cart-x display-5 d-block mb-2 text-secondary"></i>
            <p className="small mb-0">Your cart is empty.</p>
            <p className="small text-secondary">Add items by chatting or speaking to the AI!</p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto mb-3" style={{ maxHeight: '280px' }}>
              {cart.map((item, index) => (
                <div key={index} className="border-bottom py-2 pb-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <span className="fw-semibold mb-0" style={{ fontSize: '0.95rem' }}>{item.name}</span>
                      <div className="d-flex flex-wrap gap-1 mt-1">
                        {item.customizations && item.customizations.map((c, cIdx) => (
                          <span key={cIdx} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill font-monospace" style={{ fontSize: '0.75rem' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="fw-bold text-dark font-monospace" style={{ fontSize: '0.9rem' }}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className="text-muted font-monospace">₹{item.price} each</small>
                    <div className="d-flex align-items-center bg-light border rounded-pill p-1">
                      <button 
                        className="btn btn-sm btn-link text-decoration-none py-0 px-2 fw-bold text-danger"
                        onClick={() => onUpdateQty(item.menu_item_id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="mx-2 fw-semibold" style={{ fontSize: '0.85rem' }}>{item.quantity}</span>
                      <button 
                        className="btn btn-sm btn-link text-decoration-none py-0 px-2 fw-bold text-success"
                        onClick={() => onUpdateQty(item.menu_item_id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chef Notes / Special Instructions */}
            <div className="mb-3">
              <label htmlFor="notes" className="form-label small fw-semibold text-muted">Special Chef Instructions</label>
              <textarea
                id="notes"
                className="form-control form-control-sm border-2"
                rows="2"
                placeholder="e.g. Bring food fast, serve water, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            {/* Total display */}
            <div className="bg-light rounded-3 p-3 mb-3 border">
              <div className="d-flex justify-content-between align-items-center fw-bold">
                <span className="text-dark fs-6">Grand Total</span>
                <span className="text-primary font-monospace fs-5">₹{calculateTotal()}</span>
              </div>
            </div>

            {/* Order Confirmation button */}
            <button
              className="btn btn-primary bg-gradient w-100 py-3 rounded-pill fw-bold text-uppercase d-flex justify-content-center align-items-center shadow"
              style={{ letterSpacing: '1px' }}
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Placing Order...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Confirm & Place Order
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderSummary;
