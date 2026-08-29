import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoundInstructions.css'; // We'll create this next

const RoundInstructions = ({ team, onStartExam }) => {
  const [error, setError] = useState('');
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/state`);
        const data = await res.json();
        if (data.success && data.state) {
          setIsRoundActive(Boolean(data.state.round1_active));
        }
      } catch (e) {
        console.error("Failed to fetch state");
      } finally {
        setChecking(false);
      }
    };
    
    fetchState();
    const interval = setInterval(fetchState, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartExam = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        await document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        await document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        await document.documentElement.msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request failed or was blocked, but proceeding to exam.", err);
    } finally {
      onStartExam();
    }
  };

  return (
    <div className="instructions-container">
      <div className="instructions-card">
        <h1>AI SparkX — Official Competition Document</h1>
        <hr className="divider" />
        
        <h2>1. Competition Overview</h2>
        <p>AI SparkX is a team-based artificial intelligence problem-solving and innovation competition designed to test participants' ability to identify real-world problems, apply Design Thinking, develop meaningful AI-powered solutions, communicate their ideas effectively, and defend their solutions under critical questioning.</p>
        
        <h2>Round 1 — Decode the Chaos</h2>
        <div className="instruction-details">
          <p><strong>Duration:</strong> 10 Minutes</p>
          <ol>
            <li>Each team will receive one AI-based puzzle or challenge.</li>
            <li>Teams must analyze and decode the clues within the allotted time.</li>
            <li>The solution to the puzzle will reveal or lead to a hidden real-world problem.</li>
            <li>Teams must identify the actual problem represented by the puzzle.</li>
            <li>Teams must formulate a clear final problem statement.</li>
            <li>Teams must submit their final decoded problem statement before the Round 1 deadline.</li>
          </ol>
          
          <h3>Round 1 Objective</h3>
          <ul>
            <li>Observation and interpretation</li>
            <li>Logical and analytical thinking</li>
            <li>Pattern and clue identification</li>
            <li>Problem discovery</li>
            <li>Clear problem formulation</li>
          </ul>
        </div>
        
        <div className="warning-box">
          <p><strong>Important:</strong> The exam runs in strict Full-Screen mode. Exiting full-screen will immediately pause your timer and block the test until you return to full-screen.</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {checking ? (
          <button className="btn-primary start-exam-btn" disabled>CHECKING STATUS...</button>
        ) : !isRoundActive ? (
          <button className="btn-primary start-exam-btn" style={{ background: '#475569', cursor: 'not-allowed' }} disabled>
            WAITING FOR ADMIN TO START ROUND 1
          </button>
        ) : (
          <button className="btn-primary start-exam-btn" onClick={handleStartExam}>
            START EXAM (ENTER FULL SCREEN)
          </button>
        )}

        {(!isRoundActive) && (
          <button onClick={handleStartExam} style={{ marginTop: '1rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'block', width: '100%', fontFamily: 'JetBrains Mono' }}>
            FORCE START (TEST MODE)
          </button>
        )}
      </div>
    </div>
  );
};

export default RoundInstructions;
