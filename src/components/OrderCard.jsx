import React, { useState, useEffect } from 'react';

const OrderCard = ({ order, onUpdateStatus }) => {
  const [elapsedTime, setElapsedTime] = useState('');

  useEffect(() => {
    const calculateElapsed = () => {
      const created = new Date(order.created_at);
      const now = new Date();
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        setElapsedTime('Just now');
      } else {
        setElapsedTime(`${diffMins} min${diffMins > 1 ? 's' : ''} ago`);
      }
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [order.created_at]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-warning text-dark';
      case 'ACCEPTED': return 'bg-info text-dark';
      case 'PREPARING': return 'bg-primary text-white';
      case 'READY': return 'bg-success text-white';
      case 'DELIVERED': return 'bg-secondary text-white';
      case 'REJECTED': return 'bg-danger text-white';
      default: return 'bg-light text-dark';
    }
  };

  const getCardBorder = (status) => {
    switch (status) {
      case 'PENDING': return 'border-warning';
      case 'ACCEPTED': return 'border-info';
      case 'PREPARING': return 'border-primary';
      case 'READY': return 'border-success';
      default: return 'border-light';
    }
  };

  return (
    <div className={`card shadow-sm mb-3 border-start border-4 ${getCardBorder(order.status)}`} style={{ borderRadius: '12px' }}>
      <div className="card-body p-3">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
          <div>
            <h6 className="fw-bold mb-0">Order #{order.id}</h6>
            <small className="text-muted"><i className="bi bi-clock me-1"></i>{elapsedTime}</small>
          </div>
          <span className={`badge rounded-pill px-2.5 py-1.5 fw-semibold ${getStatusColor(order.status)}`}>
            {order.status}
          </span>
        </div>

        {/* Table Number */}
        <div className="d-flex justify-content-between align-items-center mb-2 bg-light p-2 rounded">
          <small className="text-muted mb-0">Table Number</small>
          <span className="fw-bold text-dark badge bg-white border">{order.table_number || 'N/A'}</span>
        </div>

        {/* Items List */}
        <div className="mb-3">
          <small className="text-muted fw-bold d-block mb-1.5">Items ({order.items ? order.items.length : 0})</small>
          <ul className="list-unstyled mb-0">
            {order.items && order.items.map((item, idx) => (
              <li key={idx} className="mb-2 bg-light-subtle p-1.5 rounded">
                <div className="d-flex justify-content-between">
                  <span className="small fw-semibold text-dark">
                    {item.quantity} x {item.item_name}
                  </span>
                  <span className="small font-monospace text-muted">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
                {item.customizations && item.customizations.length > 0 && (
                  <div className="mt-1 d-flex flex-wrap gap-1">
                    {item.customizations.map((c, cIdx) => (
                      <span key={cIdx} className="badge bg-warning-subtle text-warning-emphasis rounded-pill" style={{ fontSize: '0.65rem' }}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mb-3 bg-light p-2.5 rounded border border-light-subtle">
            <small className="text-muted d-block fw-bold mb-1"><i className="bi bi-chat-left-dots me-1"></i> Customer Note</small>
            <span className="small text-dark font-monospace text-break">{order.notes}</span>
          </div>
        )}

        {/* Total Amount */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <small className="text-muted fw-semibold">Total Amount</small>
          <span className="fw-bold text-primary font-monospace fs-6">₹{parseFloat(order.total_amount).toFixed(2)}</span>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2 justify-content-end border-top pt-2">
          {order.status === 'PENDING' && (
            <>
              <button 
                className="btn btn-sm btn-outline-danger px-3 py-1.5 rounded-pill fw-semibold"
                onClick={() => onUpdateStatus(order.id, 'REJECTED')}
              >
                Reject
              </button>
              <button 
                className="btn btn-sm btn-primary px-3 py-1.5 rounded-pill fw-semibold"
                onClick={() => onUpdateStatus(order.id, 'ACCEPTED')}
              >
                Accept
              </button>
            </>
          )}

          {order.status === 'ACCEPTED' && (
            <button 
              className="btn btn-sm btn-warning px-3 py-1.5 rounded-pill fw-semibold"
              onClick={() => onUpdateStatus(order.id, 'PREPARING')}
            >
              Start Preparing
            </button>
          )}

          {order.status === 'PREPARING' && (
            <button 
              className="btn btn-sm btn-success text-white px-3 py-1.5 rounded-pill fw-semibold animate-pulse"
              onClick={() => onUpdateStatus(order.id, 'READY')}
            >
              Mark Ready
            </button>
          )}

          {order.status === 'READY' && (
            <button 
              className="btn btn-sm btn-info text-white px-3 py-1.5 rounded-pill fw-semibold"
              onClick={() => onUpdateStatus(order.id, 'DELIVERED')}
            >
              Mark Delivered
            </button>
          )}

          {order.status === 'DELIVERED' && (
            <span className="text-success small fw-bold py-1"><i className="bi bi-check2-all me-1"></i> Delivered</span>
          )}

          {order.status === 'REJECTED' && (
            <span className="text-danger small fw-bold py-1"><i className="bi bi-x-circle me-1"></i> Rejected</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
