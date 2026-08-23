import React, { useState } from 'react';

const AdminLogin = ({ onAuthSuccess }) => {
  const [securityKey, setSecurityKey] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ securityKey })
      });
      const data = await res.json();

      if (data.success) {
        onAuthSuccess();
      } else {
        setError(data.message || 'Invalid Security Key');
      }
    } catch (err) {
      setError('Cannot connect to server.');
    }
  };

  return (
    <div className="flow-container">
      <div className="login-card">
        <div className="login-header">
          <h2 style={{ color: '#ef4444' }}>Admin Security Access</h2>
          <p>Enter the master security key to access the control panel.</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-alert">{error}</div>}
          
          <div className="form-group">
            <label>Security Key</label>
            <input 
              type="password" 
              placeholder="Enter Key..." 
              value={securityKey}
              onChange={e => setSecurityKey(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn-primary-flow" style={{ backgroundColor: '#ef4444' }}>
            Access Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
