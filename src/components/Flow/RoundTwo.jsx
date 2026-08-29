import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { DEFAULT_DATABASE } from '../../../database';
import './ParticipantFlow.css';

const RoundTwo = ({ team }) => {
  const [isRound2Active, setIsRound2Active] = useState(false);
  const [round2EndTime, setRound2EndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [socket, setSocket] = useState(null);
  const [puzzleData, setPuzzleData] = useState(null);

  useEffect(() => {
    // Determine problem statement based on assigned puzzle index
    let assignedIdx = team.assignedPuzzleIndex !== undefined && team.assignedPuzzleIndex > -1 
      ? team.assignedPuzzleIndex 
      : 0; // fallback
      
    setPuzzleData(DEFAULT_DATABASE[assignedIdx]);

    const newSocket = io(import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:6012', { path: '/sparkx/socket.io' });
    setSocket(newSocket);
    newSocket.emit('join_team', team.id || team._id);

    newSocket.on('round2_state_update', ({ active, endTime }) => {
      setIsRound2Active(active);
      setRound2EndTime(endTime ? new Date(endTime).getTime() : null);
    });

    // Fetch initial state
    fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:6012'}/api/admin/state`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.state) {
          setIsRound2Active(Boolean(data.state.round2_active));
          if (data.state.round2_endTime) {
            setRound2EndTime(new Date(data.state.round2_endTime).getTime());
          }
        }
      })
      .catch(err => console.error("Failed to fetch state", err));

    return () => newSocket.disconnect();
  }, [team]);

  useEffect(() => {
    if (!isRound2Active || !round2EndTime) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = round2EndTime - now;
      if (distance <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.floor(distance / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRound2Active, round2EndTime]);

  const formatTime = (secs) => {
    if (secs <= 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!team.qualifiedForRound2) {
    return (
      <div className="flow-container">
        <div className="login-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>Not Qualified</h2>
          <p>Sorry, your team has not qualified for Round 2.</p>
        </div>
      </div>
    );
  }

  if (!isRound2Active) {
    return (
      <div className="flow-container">
        <div className="login-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h2 style={{ color: '#f59e0b' }}>Round 2 Not Started</h2>
          <p>Please wait for the administrator to start Round 2.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-container">
      <div className="login-card" style={{ maxWidth: '900px', width: '90%', textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="login-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ color: '#10b981', fontSize: '2.5rem', fontWeight: 'bold' }}>Round 2: Design & Propose</h2>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Analyze your problem statement and prepare your solution.</p>
        </div>
        
        {/* Massive Global Timer */}
        <div style={{ 
          margin: '2rem auto', 
          padding: '3rem', 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '24px', 
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 0 20px rgba(168, 85, 247, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
           <h3 style={{ margin: '0 0 1rem 0', color: '#a855f7', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '1.1rem' }}>Global Timer</h3>
           
           <div style={{ 
             fontSize: '6rem', 
             lineHeight: '1',
             fontWeight: '900', 
             fontFamily: 'monospace',
             color: timeLeft <= 300 ? '#ef4444' : '#fff', 
             letterSpacing: '8px',
             textShadow: timeLeft <= 300 ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 0 20px rgba(255, 255, 255, 0.3)'
           }}>
             {formatTime(timeLeft)}
           </div>
           
           {timeLeft <= 300 && timeLeft > 0 && <p className="pulse-text" style={{ color: '#ef4444', fontWeight: 'bold', margin: '1rem 0 0 0', fontSize: '1.2rem' }}>5 Minutes Remaining! Wrap up your presentation.</p>}
           {timeLeft <= 0 && <p className="pulse-text" style={{ color: '#ef4444', fontWeight: 'bold', margin: '1rem 0 0 0', fontSize: '1.5rem' }}>TIME IS UP! Proceed to Pitching.</p>}
        </div>

        {/* Problem Statement Display */}
        <div style={{ 
          padding: '2rem', 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
          borderRadius: '16px', 
          margin: '3rem 0 1rem 0',
          borderLeft: '6px solid #a855f7',
          textAlign: 'left',
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.5rem' }}>Your Assigned Problem:</h3>
            <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '0.3rem 0.8rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
              {puzzleData?.problemStatement?.id || "N/A"}
            </span>
          </div>
          
          <h4 style={{ color: '#38bdf8', fontSize: '1.2rem', marginBottom: '0.5rem', marginTop: 0 }}>
            {puzzleData?.problemStatement?.title}
          </h4>
          
          <p style={{ fontSize: '1.25rem', lineHeight: '1.7', color: '#e2e8f0' }}>
            "{puzzleData?.problemStatement?.description || "Loading problem statement..."}"
          </p>
        </div>
        
        {/* Instructions */}
        <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', textAlign: 'left', marginTop: '2rem' }}>
          <h4 style={{ color: '#cbd5e1', marginTop: 0, fontSize: '1.1rem' }}>Round 2 Instructions:</h4>
          <ul style={{ paddingLeft: '1.5rem', color: '#94a3b8', lineHeight: '1.6', margin: 0 }}>
            <li>Collaborate with your team to design a comprehensive, agentic AI solution for your assigned problem.</li>
            <li>Prepare your oral presentation before the timer runs out (No PPT or laptops allowed on stage).</li>
            <li>Once the timer ends, you will proceed to Round 3 (Presentations & Crossfire).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoundTwo;
