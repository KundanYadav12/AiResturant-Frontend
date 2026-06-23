import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerOrder from './pages/CustomerOrder';
import Login from './pages/Login';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// Import Bootstrap 5 CSS & Icons (loaded globally)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Customer QR Ordering */}
        <Route path="/order/:tableToken" element={<CustomerOrder />} />
        
        {/* Staff Authentication */}
        <Route path="/login" element={<Login />} />
        
        {/* Manager Live Kanban Board */}
        <Route path="/manager" element={<ManagerDashboard />} />
        
        {/* Owner Analytics & Panel */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Super Admin Dashboard */}
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        
        {/* Default route redirects to Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
