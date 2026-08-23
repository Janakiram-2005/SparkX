import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const WaitingRoom = ({ team, onRoundStart }) => {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('Waiting for Admin to unlock Round 1...');

  useEffect(() => {
    // Check initial state
    fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/state`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.state && data.state.round1_active) {
          onRoundStart();
        }
      });

    // Connect to websocket
    const newSocket = io(import.meta.env.PROD ? undefined : 'http://localhost:5000');
    setSocket(newSocket);
    
    newSocket.emit('join_team', team.id);

    newSocket.on('global_state_update', ({ round1_active }) => {
      if (round1_active) {
        setStatus('Round 1 is LIVE! Redirecting...');
        setTimeout(() => onRoundStart(), 1500);
      } else {
        setStatus('Round 1 is locked. Waiting...');
      }
    });

    return () => newSocket.disconnect();
  }, [team, onRoundStart]);

  return (
    <div className="flow-container">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-header">
          <h2>Welcome, {team.team_name}</h2>
          <p className="badge badge-waiting">STATUS: WAITING</p>
        </div>
        
        <div style={{ marginTop: '2rem' }}>
          <div className="spinner"></div>
          <h3 style={{ marginTop: '1rem', color: '#3b82f6' }}>{status}</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '1rem' }}>
            Please wait on this page. The puzzle will automatically load as soon as the Admin starts the round.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
