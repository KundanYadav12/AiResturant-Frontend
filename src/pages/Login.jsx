import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // If token exists, direct to dashboard
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      redirectUser(user.role);
    }
  }, []);

  const redirectUser = (role) => {
    if (role === 'OWNER') {
      navigate('/admin');
    } else if (role === 'MANAGER') {
      navigate('/manager');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await authAPI.login(email, password);
      redirectUser(data.user.role);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient bg-dark" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
      <div className="container" style={{ maxWidth: '440px' }}>
        <div className="card shadow-lg border-0 p-4 p-sm-5 bg-white" style={{ borderRadius: '24px' }}>
          
          <div className="text-center mb-4">
            <div className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3 shadow" style={{ width: '60px', height: '60px' }}>
              <i className="bi bi-shop fs-3"></i>
            </div>
            <h4 className="fw-bold text-dark mb-1">Staff Portal</h4>
            <p className="text-muted small">Sign in to manage orders & menu items</p>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show border-0 rounded-3 small p-3 mb-3 d-flex align-items-center" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="emailInput" className="form-label small fw-semibold text-muted">Email Address</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-2 border-end-0 rounded-start-pill px-3 text-secondary"><i className="bi bi-envelope"></i></span>
                <input
                  type="email"
                  className="form-control border-2 border-start-0 rounded-end-pill py-2.5 px-3 bg-light"
                  id="emailInput"
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="passwordInput" className="form-label small fw-semibold text-muted">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-2 border-end-0 rounded-start-pill px-3 text-secondary"><i className="bi bi-lock"></i></span>
                <input
                  type="password"
                  className="form-control border-2 border-start-0 rounded-end-pill py-2.5 px-3 bg-light"
                  id="passwordInput"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary bg-gradient w-100 py-3 rounded-pill fw-bold text-uppercase d-flex justify-content-center align-items-center shadow"
              style={{ letterSpacing: '1px' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <span className="text-muted small">Demo Login Credentials:</span>
            <div className="bg-light p-2.5 rounded-3 border mt-1.5 font-monospace text-start" style={{ fontSize: '0.75rem' }}>
              <div className="mb-1"><span className="fw-bold">Owner:</span> owner@bistro.com</div>
              <div><span className="fw-bold">Manager:</span> manager@bistro.com</div>
              <div className="mt-1 border-top pt-1 text-center text-secondary">Password: <span className="fw-bold">password123</span></div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Login;
