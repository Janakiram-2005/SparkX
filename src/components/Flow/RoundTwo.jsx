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

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('join_team', team.id || team._id);

    newSocket.on('round2_state_update', ({ active, endTime }) => {
      setIsRound2Active(active);
      setRound2EndTime(endTime ? new Date(endTime).getTime() : null);
    });

    // Fetch initial state
    fetch('http://localhost:5000/api/admin/state')
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
      <div className="login-card" style={{ maxWidth: '800px', textAlign: 'center' }}>
        <div className="login-header">
          <h2 style={{ color: '#10b981' }}>Round 2: Design & Propose</h2>
          <p>Analyze your problem statement and prepare your solution.</p>
        </div>
        
        <div style={{ margin: '1.5rem 0', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
           <h3 style={{ margin: '0 0 0.5rem 0', color: '#a855f7' }}>GLOBAL TIMER</h3>
           <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: timeLeft <= 300 ? '#ef4444' : '#fff', letterSpacing: '4px' }}>
             {formatTime(timeLeft)}
           </div>
           {timeLeft <= 300 && timeLeft > 0 && <p style={{ color: '#ef4444', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>5 Minutes Remaining!</p>}
           {timeLeft <= 0 && <p style={{ color: '#ef4444', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>TIME IS UP!</p>}
        </div>

        <div style={{ padding: '2rem', background: '#f1f5f9', borderRadius: '12px', margin: '2rem 0' }}>
          <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Your Problem Statement:</h3>
          <p style={{ fontSize: '1.3rem', lineHeight: '1.6', color: '#334155', fontWeight: 'bold' }}>
            "{puzzleData?.puzzle?.problemStatement || "Loading problem statement..."}"
          </p>
        </div>
        
        <div style={{ padding: '1.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', textAlign: 'left', marginTop: '1.5rem' }}>
          <h4 style={{ color: '#a855f7', marginTop: 0 }}>Instructions:</h4>
          <ul style={{ paddingLeft: '1.5rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            <li>Collaborate with your team to design a comprehensive solution.</li>
            <li>Prepare your presentation (PPT) before the timer runs out.</li>
            <li>Once the timer ends, you will proceed to Round 3 (Presentations).</li>
            <li>Keep an eye on the global timer!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoundTwo;
