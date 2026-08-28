import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io(import.meta.env.PROD ? '/sparkx' : 'http://localhost:5000', {
  path: '/sparkx/socket.io'
});

const PostRoundWaitingRoom = ({ team }) => {
  const [globalState, setGlobalState] = useState({
    results_announced: false,
    round2_active: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch initial state
    const fetchState = async () => {
      try {
        const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/state`);
        const data = await res.json();
        if (data.success) {
          setGlobalState({
            results_announced: data.state.results_announced,
            round2_active: data.state.round2_active
          });
        }
      } catch (err) {
        console.error("Failed to fetch state", err);
      }
    };
    fetchState();

    socket.on('global_state_update', (newState) => {
      setGlobalState(prev => ({ ...prev, ...newState }));
    });

    return () => {
      socket.off('global_state_update');
    };
  }, []);

  useEffect(() => {
    // If Round 2 becomes active, and results are announced
    if (globalState.round2_active && globalState.results_announced) {
      if (team.qualifiedForRound2) {
        navigate('/round2');
      } else {
        // Disqualified teams log out after 60 seconds
        const timer = setTimeout(() => {
          localStorage.removeItem('sparkx_session');
          navigate('/');
        }, 60000); // 1 minute
        return () => clearTimeout(timer);
      }
    }
  }, [globalState.round2_active, globalState.results_announced, team.qualifiedForRound2, navigate]);

  return (
    <div className="flow-container" style={{ textAlign: 'center', justifyContent: 'center' }}>
      <div className="login-card" style={{ maxWidth: '600px', width: '90%' }}>
        {!globalState.results_announced ? (
          <>
            <h2 style={{ fontSize: '2.5rem', color: '#60a5fa', marginBottom: '1rem' }}>Please Wait</h2>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>
              Round 1 is completed. The admin will announce the results shortly.
              Stay on this page.
            </p>
            <div style={{ marginTop: '2rem' }}>
              <div className="loading-spinner" style={{ border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            </div>
            <style>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
          </>
        ) : (
          <>
            {team.qualifiedForRound2 ? (
              <>
                <h2 style={{ fontSize: '2.5rem', color: '#4ade80', marginBottom: '1rem' }}>Congratulations!</h2>
                <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '2rem' }}>
                  Your team has qualified for Round 2!
                </p>
                {globalState.round2_active ? (
                  <button className="btn-primary-flow" onClick={() => navigate('/round2')}>Start Round 2</button>
                ) : (
                  <p style={{ color: '#facc15' }}>Waiting for Admin to start Round 2...</p>
                )}
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '2.5rem', color: '#f87171', marginBottom: '1rem' }}>Disqualified</h2>
                <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>
                  Sorry to say, your team was disqualified. Thank you for participating.
                </p>
                {globalState.round2_active && (
                   <p style={{ color: '#ef4444', marginTop: '1rem' }}>You will be logged out automatically in 1 minute.</p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PostRoundWaitingRoom;
