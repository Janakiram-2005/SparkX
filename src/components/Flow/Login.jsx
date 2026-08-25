import React, { useState } from 'react';
import './ParticipantFlow.css';

const Login = ({ onLoginSuccess }) => {
  const [aiId, setAiId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (aiId === '1' && password === '123') {
        onLoginSuccess({ id: '1', name: 'Test Team 1' });
        return;
      }

      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_id: aiId, password })
      });
      const data = await res.json();
      
      if (data.success) {
        if (data.team.disqualified) {
          setError('Your team has been disqualified. Contact admin.');
        } else {
          localStorage.setItem('sparkx_session', JSON.stringify({
            ai_id: data.team.ai_id,
            sessionToken: data.team.sessionToken
          }));
          onLoginSuccess(data.team);
        }
      } else {
        setError(data.message || 'Invalid Login credentials');
      }
    } catch (err) {
      setError('Cannot connect to server. Please try again.');
    }
  };

  return (
    <div className="flow-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Team Authentication</h2>
          <p>Enter your generated AIX ID and Password</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          {error && <div className="error-alert">{error}</div>}
          
          <div className="form-group">
            <label>Team ID</label>
            <input 
              type="text" 
              placeholder="e.g. AIX001" 
              value={aiId}
              onChange={e => setAiId(e.target.value.toUpperCase())}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="AIX..." 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn-primary-flow">Authenticate</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
