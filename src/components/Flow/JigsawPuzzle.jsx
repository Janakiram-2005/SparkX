import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import generateAIAgenticImage from '../../utils/puzzleGenerator';
import { DEFAULT_DATABASE } from '../../../database';
import './JigsawPuzzle.css';

const JigsawPuzzle = ({ team, onComplete }) => {
  const [targetDataUrl, setTargetDataUrl] = useState('');
  const [targetDataUrlNoText, setTargetDataUrlNoText] = useState('');
  const [pieces, setPieces] = useState([]);
  const [boardSlots, setBoardSlots] = useState(Array(36).fill(null));
  const [trayPieces, setTrayPieces] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const matchedCountRef = useRef(0);
  
  // Game State
  const [puzzleData, setPuzzleData] = useState(null);
  const [phase, setPhase] = useState('locked'); // 'locked' -> 'playing' -> 'ended'
  const [timeLeft, setTimeLeft] = useState(60); // 60s unlock, then 600s play
  const [points, setPoints] = useState(1000);
  const pointsRef = useRef(1000);
  const [showWarning, setShowWarning] = useState(false);
  const [warningText, setWarningText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showRefModal, setShowRefModal] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [issueRaised, setIssueRaised] = useState(false);
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState(null);
  const timerRef = useRef(null);

  // 1. Initialization & DB Randomization
  useEffect(() => {
    // Random problem assignment or reuse existing
    let assignedIdx = team.assignedPuzzleIndex !== undefined && team.assignedPuzzleIndex > -1 
      ? team.assignedPuzzleIndex 
      : Math.floor(Math.random() * DEFAULT_DATABASE.length);
      
    const assignedData = DEFAULT_DATABASE[assignedIdx].puzzle;
    setPuzzleData(assignedData);

    const newSocket = io(import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:6012', { path: '/sparkx/socket.io' });
    setSocket(newSocket);
    newSocket.emit('join_team', team.id || team._id);
    
    // Save to DB if it was newly generated
    if(team.assignedPuzzleIndex === undefined || team.assignedPuzzleIndex === -1) {
      newSocket.emit('assign_puzzle', { teamId: team.id || team._id, index: assignedIdx });
      // Update local storage so Round 2 can read it!
      const session = JSON.parse(localStorage.getItem('sparkx_session') || '{}');
      if (session.team) {
        session.team.assignedPuzzleIndex = assignedIdx;
        localStorage.setItem('sparkx_session', JSON.stringify(session));
      }
    }

    const problemStatement = DEFAULT_DATABASE[assignedIdx].problemStatement;
    
    // Generate two canvases: one for pieces (no text) and one for reference/flip (with text)
    const generatePuzzles = async () => {
      try {
        const masterCanvas = await generateAIAgenticImage(team.id || team._id, assignedData, problemStatement, false, assignedIdx);
        const masterCanvasRef = await generateAIAgenticImage(team.id || team._id, assignedData, problemStatement, true, assignedIdx);
        
        setTargetDataUrl(masterCanvasRef.toDataURL('image/png'));
        setTargetDataUrlNoText(masterCanvas.toDataURL('image/png'));

        const generatedPieces = [];
        const tileSize = 120;
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 6; c++) {
            const index = r * 6 + c;
            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = tileSize;
            tileCanvas.height = tileSize;
            const ctx = tileCanvas.getContext('2d');
            
            ctx.drawImage(masterCanvas, c * tileSize, r * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, tileSize, tileSize);

            generatedPieces.push({ id: index, row: r, col: c, dataUrl: tileCanvas.toDataURL('image/png') });
          }
        }
        
        setPieces(generatedPieces);
        setTrayPieces([...generatedPieces].sort(() => Math.random() - 0.5));
      } catch (err) {
        console.error("Error generating puzzle images:", err);
      }
    };
    generatePuzzles();

    // Socket already initialized above
    newSocket.on('timer_adjustment', ({ seconds }) => {
      setTimeLeft(prev => {
        const newTime = prev + seconds;
        return newTime > 0 ? newTime : 0;
      });
    });

    newSocket.on('disqualified', () => {
      localStorage.removeItem('sparkx_session');
      window.location.href = '/login';
    });

    return () => newSocket.disconnect();
  }, [team.id, team._id]);

  // 2. Full-Screen Anti-Cheat
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      } else {
        setIsFullscreen(true);
      }
    };

    let lastTrigger = 0;
    const triggerTabViolation = () => {
      const now = Date.now();
      if (now - lastTrigger < 1000) return; // Prevent double trigger from blur + visibilitychange
      lastTrigger = now;

      setTabWarnings(prev => {
        const newCount = prev + 1;
        if (newCount >= 5) {
           if (socket) socket.emit('tab_switch_violation', { teamId: team.id || team._id });
        } else {
           setShowTabWarning(true);
           if (socket) socket.emit('tab_switch_violation', { teamId: team.id || team._id });
        }
        return newCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) triggerTabViolation();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', triggerTabViolation);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', triggerTabViolation);
    };
  }, [socket, team]);

  const requestFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch(e) { console.error(e); }
  };

  // 3. Timers
  useEffect(() => {
    if (!isFullscreen || phase === 'ended') {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (phase === 'locked') {
            setPhase('playing');
            setShowWarning(false);
            return 600; // start 10 min
          } else if (phase === 'playing') {
            handleTimeUp();
            return 0;
          }
        }
        
        // Warnings
        if (phase === 'locked' && prev <= 6) {
          setShowWarning(true);
          setWarningText(`Unlocking in ${prev - 1}...`);
        }
        if (prev > 6) setShowWarning(false);

        // Point decay
        if (phase === 'playing') {
          setPoints(p => {
            const newP = Math.max(0, p - 1);
            pointsRef.current = newP;
            return newP;
          });
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, isFullscreen]);

  // 4. Progress Sync
  useEffect(() => {
    let matched = 0;
    boardSlots.forEach((p, idx) => {
      if (p && p.id === idx) matched++;
    });
    setMatchedCount(matched);
    matchedCountRef.current = matched;
    
    if (socket) {
      socket.emit('puzzle_update', { teamId: team.id, progress: Math.round((matched / 36) * 100) });
    }

    if (matched === 36 && phase === 'playing') {
      handleVictory();
    }
  }, [boardSlots, socket, team.id, phase]);

  const handleVictory = () => {
    setPhase('ended');
    if (socket) socket.emit('puzzle_complete', { teamId: team.id, score: points });
    
    // Show flipped image for 2 seconds, then pop up the problem statement modal
    setTimeout(() => {
      setShowVictoryModal(true);
    }, 2000);
  };

  const handleTimeUp = () => {
    setPhase('ended');
    const finalScore = Math.floor(pointsRef.current * (matchedCountRef.current / 36));
    setPoints(finalScore);
    
    if (socket) socket.emit('puzzle_complete', { teamId: team.id, score: finalScore });
    
    // Show flipped image for 2 seconds, then pop up the problem statement modal
    setTimeout(() => {
      setShowVictoryModal(true);
    }, 2000);
  };

  const handleRaiseIssue = () => {
    if (socket && !issueRaised) {
      socket.emit('raise_issue', { teamId: team.id || team._id, officialTeamId: team.officialTeamId || 'N/A', teamName: team.team_name || `Team ${team.id || team._id}` });
      setIssueRaised(true);
      setTimeout(() => setIssueRaised(false), 10000); // 10s cooldown
    }
  };

  // Drag Drop Mechanics (Locked in Familiarization Phase)
  const executeMovePiece = (sel, targetSlotIndex) => {
    if (phase === 'locked') return; // Cannot drag during 1-min lock

    const existingTargetPiece = boardSlots[targetSlotIndex];
    let newTray = [...trayPieces];
    let newBoard = [...boardSlots];

    if (sel.source === 'tray') {
      newTray = newTray.filter(p => p.id !== sel.pieceId);
      if (existingTargetPiece) newTray.push(existingTargetPiece);
      newBoard[targetSlotIndex] = sel.piece;
    } else if (sel.source === 'board') {
      newBoard[sel.locationIndex] = existingTargetPiece;
      newBoard[targetSlotIndex] = sel.piece;
    }

    setTrayPieces(newTray);
    setBoardSlots(newBoard);
    setSelectedPiece(null);
  };

  const handleDragStart = (e, piece, source, locationIndex) => {
    if (phase === 'locked') { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', JSON.stringify({ pieceId: piece.id, source, locationIndex }));
  };

  const handleDropBoard = (e, targetSlotIndex) => {
    if (phase === 'locked') return;
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    const pieceObj = pieces.find(p => p.id === data.pieceId);
    if (!pieceObj) return;

    executeMovePiece({ pieceId: data.pieceId, piece: pieceObj, source: data.source, locationIndex: data.locationIndex }, targetSlotIndex);
  };

  const handleDropTray = (e) => {
    if (phase === 'locked') return;
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    
    if (data.source === 'board') {
      const pieceObj = pieces.find(p => p.id === data.pieceId);
      if (!pieceObj) return;
      
      let newTray = [...trayPieces, pieceObj];
      let newBoard = [...boardSlots];
      newBoard[data.locationIndex] = null;
      
      setTrayPieces(newTray);
      setBoardSlots(newBoard);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="stitch-layout">
      {/* Background effect */}
      <div className="stitch-bg"></div>

      {/* Anti Cheat Overlay */}
      {!isFullscreen && !showTabWarning && !showVictoryModal && (
        <div className="anti-cheat-overlay">
          <h2>⚠️ FULL SCREEN EXITED</h2>
          <p>The timer has been paused. You must remain in full-screen to continue.</p>
          <button className="btn-primary" onClick={requestFullscreen}>ENTER FULL SCREEN</button>
        </div>
      )}

      {/* Tab Switch Overlay */}
      {showTabWarning && (
        <div className="anti-cheat-overlay" style={{ background: 'rgba(220, 38, 38, 0.95)', zIndex: 100 }}>
          <h1 style={{ fontSize: '3rem', margin: 0, textShadow: '0 0 20px #000' }}>⚠️ TAB SWITCH DETECTED</h1>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Warning {tabWarnings} of 5.
          </p>
          <p>Switching tabs or minimizing the browser is strictly prohibited. Your actions have been logged.</p>
          <p style={{ marginTop: '1rem', color: '#ffb' }}>Reaching 5 warnings will result in immediate disqualification.</p>
          <button className="btn-primary" style={{ marginTop: '2rem', background: '#000', color: '#fff', border: '1px solid #fff' }} onClick={() => {
            setShowTabWarning(false);
            requestFullscreen();
          }}>I UNDERSTAND</button>
        </div>
      )}

      {/* 5s Warning Overlay */}
      {showWarning && isFullscreen && !showVictoryModal && (
        <div className="warning-overlay">
          <h1 className="warning-huge">{warningText}</h1>
        </div>
      )}

      {/* Reference Image Modal */}
      {showRefModal && (
        <div className="anti-cheat-overlay" onClick={() => setShowRefModal(false)}>
          <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '2rem', borderRadius: '16px', position: 'relative' }}>
            <button 
              onClick={() => setShowRefModal(false)}
              style={{ position: 'absolute', top: '10px', right: '15px', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h3 style={{ marginTop: 0, color: 'var(--stitch-primary)' }}>Target Reference</h3>
            <img src={targetDataUrlNoText} alt="Reference" style={{ width: '400px', height: '400px', objectFit: 'cover', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      {/* Victory Problem Statement Modal */}
      {showVictoryModal && (
        <div className="anti-cheat-overlay victory-modal" style={{ background: 'rgba(0, 0, 0, 0.9)', zIndex: 90 }}>
          <div className="glass-panel" style={{ padding: '3rem', borderRadius: '16px', maxWidth: '800px', textAlign: 'center', border: '2px solid var(--stitch-primary)', boxShadow: '0 0 40px rgba(0, 243, 255, 0.3)' }}>
            <h1 style={{ color: 'var(--stitch-primary)', fontSize: '3rem', margin: '0 0 1rem 0', textShadow: '0 0 15px rgba(0, 243, 255, 0.8)' }}>COMPLETED SUCCESSFULLY!</h1>
            <p style={{ fontSize: '1.2rem', color: '#cbd5e1', marginBottom: '2rem' }}>Congratulations Team {team.team_name}! You have successfully completed the Round 1 challenge.</p>
            
            <div className="problem-statement-box" style={{ background: 'rgba(0,0,0,0.6)', padding: '2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-around' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8' }}>Time Taken</h3>
                <h2 style={{ margin: 0, color: '#fff', fontSize: '2rem' }}>{600 - timeLeft}s</h2>
              </div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8' }}>Score</h3>
                <h2 style={{ margin: 0, color: 'var(--stitch-primary)', fontSize: '2rem', textShadow: '0 0 10px rgba(0,243,255,0.5)' }}>{points} pts</h2>
              </div>
            </div>
            
            <button className="btn-primary" onClick={onComplete} style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>
              GO TO DASHBOARD
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="stitch-header">
        <div className="header-left">
          <h1 className="header-title">AI SPARKX • TEAM</h1>
          <div className="team-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>group</span>
            <span>TEAM {team.team_name ? team.team_name.toUpperCase() : 'BETA'}</span>
          </div>
        </div>
        <div className="header-right">
          {/* Removed Settings button */}
        </div>
      </header>

      {/* Sidebar */}
      <nav className="stitch-sidebar">
        <div className="sidebar-info">
          <div className="sidebar-icon">
            <span className="material-symbols-outlined text-tertiary">extension</span>
          </div>
          <div>
            <h2>Task Force</h2>
            <p>{matchedCount}/36 Pieces</p>
          </div>
        </div>
        <div className="sidebar-links">
          <a className="active" href="#workspace">
            <span className="material-symbols-outlined">extension</span> Workspace
          </a>
          <a href="#chat">
            <span className="material-symbols-outlined">forum</span> Team Chat
          </a>
          {/* Removed Stats link */}
        </div>
        <div className="sidebar-footer">
          <button className={`btn-invite ${issueRaised ? 'btn-cooldown' : 'btn-danger'}`} onClick={handleRaiseIssue} disabled={issueRaised}>
            <span className="material-symbols-outlined">{issueRaised ? 'check' : 'warning'}</span>
            {issueRaised ? 'Alert Sent' : 'Raise Issue'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="stitch-main">
        {/* Stats Bar */}
        <div className="stitch-stats-bar">
          <div className="stat-timer">
            <span className="material-symbols-outlined text-error">timer</span>
            <div className="stat-col">
              <span className="stat-label">{phase === 'locked' ? 'UNLOCKS IN' : 'TIME REMAINING'}</span>
              <span className="stat-val timer-val">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <div className="stat-progress">
            <div className="progress-header">
              <span>PUZZLE PROGRESS</span>
              <span className="text-tertiary">{matchedCount}/36 Pieces</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(matchedCount/36)*100}%` }}></div>
            </div>
          </div>

          <div className="stat-points">
            <span className="material-symbols-outlined text-primary">stars</span>
            <div className="stat-col">
              <span className="stat-label">CURRENT POINTS</span>
              <span className="stat-val text-primary">{points} <span style={{fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--stitch-text-dim)'}}>pts</span></span>
            </div>
          </div>
        </div>

        {/* Puzzle Area */}
        <div className="stitch-puzzle-area">
          {/* Left Column: Grid */}
          <div className="stitch-grid-wrapper">
            <div className="stitch-grid-bg"></div>
            
            <div className={`flip-container ${matchedCount === 36 ? 'flipped' : ''}`}>
              <div className="flip-inner">
                <div className="flip-front">
                  <div className={`stitch-grid ${phase === 'locked' ? 'locked' : ''}`}>
                    {boardSlots.map((piece, i) => (
                      <div 
                        key={i} 
                        className={`stitch-slot ${piece && piece.id === i ? 'correct-slot' : ''}`}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => handleDropBoard(e, i)}
                      >
                        {piece ? (
                          <img 
                            src={piece.dataUrl} 
                            alt="piece" 
                            className="stitch-piece"
                            draggable={phase !== 'locked'}
                            onDragStart={e => handleDragStart(e, piece, 'board', i)}
                          />
                        ) : (
                          <span className="material-symbols-outlined slot-icon">add</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flip-back">
                  <img src={targetDataUrl} alt="Solved" className="solved-image" />
                </div>
              </div>
            </div>

            {phase === 'locked' && <div className="locked-overlay-text">UI FAMILIARIZATION PHASE. PIECES ARE LOCKED.</div>}
          </div>

          {/* Right Column: Tray */}
          <div className="stitch-tray-wrapper" onDragOver={e => e.preventDefault()} onDrop={handleDropTray}>
            <div className="tray-header">
              <h3>Pieces Tray</h3>
              <span className="tray-avail">{trayPieces.length} avail</span>
            </div>
            <div className="tray-grid">
              {trayPieces.map((piece, i) => (
                <div className="tray-piece-container" key={piece.id}>
                  <img 
                    src={piece.dataUrl} 
                    alt="tray piece" 
                    className="stitch-piece"
                    draggable={phase !== 'locked'}
                    onDragStart={e => handleDragStart(e, piece, 'tray', i)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <button className="stitch-fab" onClick={() => setShowRefModal(true)}>
          <span className="material-symbols-outlined text-primary">visibility</span>
          <span>View Reference Image</span>
        </button>
      </main>
    </div>
  );
};

export default JigsawPuzzle;
