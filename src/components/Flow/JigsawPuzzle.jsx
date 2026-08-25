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
  
  // Game State
  const [puzzleData, setPuzzleData] = useState(null);
  const [phase, setPhase] = useState('locked'); // 'locked' -> 'playing' -> 'ended'
  const [timeLeft, setTimeLeft] = useState(60); // 60s unlock, then 600s play
  const [points, setPoints] = useState(1000);
  const [showWarning, setShowWarning] = useState(false);
  const [warningText, setWarningText] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showRefModal, setShowRefModal] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
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

    const newSocket = io(import.meta.env.PROD ? undefined : 'http://localhost:5000');
    setSocket(newSocket);
    newSocket.emit('join_team', team.id || team._id);
    
    // Save to DB if it was newly generated
    if(team.assignedPuzzleIndex === undefined || team.assignedPuzzleIndex === -1) {
      newSocket.emit('assign_puzzle', { teamId: team.id || team._id, index: assignedIdx });
    }

    const problemStatement = DEFAULT_DATABASE[assignedIdx].problemStatement;
    
    // Generate two canvases: one for pieces (no text) and one for reference/flip (with text)
    const masterCanvas = generateAIAgenticImage(team.id || team._id, assignedData, problemStatement, false);
    const masterCanvasRef = generateAIAgenticImage(team.id || team._id, assignedData, problemStatement, true);
    
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

    // Socket already initialized above
    newSocket.on('timer_adjustment', ({ seconds }) => {
      setTimeLeft(prev => {
        const newTime = prev + seconds;
        return newTime > 0 ? newTime : 0;
      });
    });

    newSocket.on('disqualified', () => {
      alert("YOUR TEAM HAS BEEN DISQUALIFIED FOR TAB SWITCHING.");
      localStorage.removeItem('sparkx_session');
      navigate('/login');
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

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab switch detected
        setTabWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
             if (socket) socket.emit('tab_switch_violation', { teamId: team.id || team._id });
          } else {
             setShowTabWarning(true);
             if (socket) socket.emit('tab_switch_violation', { teamId: team.id || team._id });
          }
          return newCount;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        if (phase === 'playing' && prev <= 6) {
          setShowWarning(true);
          setWarningText(`Time Up in ${prev - 1}...`);
        }
        if (prev > 6) setShowWarning(false);

        // Point decay
        if (phase === 'playing') {
          setPoints(p => Math.max(0, p - 1));
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
    setTimeout(() => onComplete(), 3000);
  };

  const handleTimeUp = () => {
    setPhase('ended');
    setPoints(0);
    setShowWarning(true);
    setWarningText("TIME IS UP!");
    if (socket) socket.emit('puzzle_complete', { teamId: team.id, score: 0 });
    setTimeout(() => onComplete(), 3000);
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
    <div className="puzzle-layout">
      {/* Anti Cheat Overlay */}
      {!isFullscreen && !showTabWarning && (
        <div className="anti-cheat-overlay">
          <h2>⚠️ FULL SCREEN EXITED</h2>
          <p>The timer has been paused. You must remain in full-screen to continue.</p>
          <button className="btn-primary" onClick={requestFullscreen}>ENTER FULL SCREEN</button>
        </div>
      )}

      {/* Tab Switch Overlay */}
      {showTabWarning && (
        <div className="anti-cheat-overlay" style={{ background: 'rgba(220, 38, 38, 0.95)' }}>
          <h1 style={{ fontSize: '3rem', margin: 0, textShadow: '0 0 20px #000' }}>⚠️ TAB SWITCH DETECTED</h1>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            Warning {tabWarnings} of 3.
          </p>
          <p>Switching tabs or minimizing the browser is strictly prohibited. Your actions have been logged.</p>
          <p style={{ marginTop: '1rem', color: '#ffb' }}>Reaching 3 warnings will result in immediate disqualification.</p>
          <button className="btn-primary" style={{ marginTop: '2rem', background: '#000', color: '#fff', border: '1px solid #fff' }} onClick={() => {
            setShowTabWarning(false);
            requestFullscreen();
          }}>I UNDERSTAND</button>
        </div>
      )}

      {/* 5s Warning Overlay */}
      {showWarning && isFullscreen && (
        <div className="warning-overlay">
          <h1 className="warning-huge">{warningText}</h1>
        </div>
      )}

      <div className="puzzle-header">
        <div className="puzzle-title">
          <span className="purple">AGENTIC</span> AI DAY
          {puzzleData && <span className="puzzle-theme-badge">{puzzleData.theme}</span>}
        </div>
        <div className="team-info">Team #{team.id} - {team.name}</div>
      </div>

      <div className="puzzle-subheader">
        <div className={`stat-box timer ${phase === 'locked' ? 'locked-timer' : ''}`}>
          <span className="label">{phase === 'locked' ? 'UNLOCKS IN' : 'TIMER'}</span>
          <span className="val">{formatTime(timeLeft)}</span>
        </div>
        <div className="stat-box flex-grow">
          <span className="label">PROGRESS ({matchedCount}/36)</span>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${(matchedCount/36)*100}%` }}></div>
          </div>
        </div>
        <div className="stat-box points">
          <span className="label">POINTS</span>
          <span className="val">{points}</span>
        </div>
        <button className="ref-img-btn" onClick={() => setShowRefModal(true)}>
          REFERENCE IMG
        </button>
      </div>

      {showRefModal && (
        <div className="anti-cheat-overlay" onClick={() => setShowRefModal(false)}>
          <div className="ref-modal-content" onClick={e => e.stopPropagation()} style={{ background: '#0f172a', padding: '2rem', borderRadius: '16px', position: 'relative' }}>
            <button 
              onClick={() => setShowRefModal(false)}
              style={{ position: 'absolute', top: '10px', right: '15px', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <h3 style={{ marginTop: 0, color: 'var(--purple-neon)' }}>Target Reference</h3>
            <img src={targetDataUrlNoText} alt="Reference" style={{ width: '400px', height: '400px', objectFit: 'cover', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      <div className="puzzle-main-content">
        <div className="board-wrapper">
          <div className={`flip-container ${matchedCount === 36 ? 'flipped' : ''}`}>
            <div className="flip-inner">
              <div className="flip-front">
                <div className={`board-grid ${phase === 'locked' ? 'board-locked' : ''}`}>
                  {boardSlots.map((piece, i) => (
                    <div 
                      key={i} 
                      className={`board-slot ${piece && piece.id === i ? 'correct-slot' : ''}`}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDropBoard(e, i)}
                    >
                      {piece ? (
                        <img 
                          src={piece.dataUrl} 
                          alt="piece" 
                          className="puzzle-piece"
                          draggable={phase !== 'locked'}
                          onDragStart={e => handleDragStart(e, piece, 'board', i)}
                        />
                      ) : (
                        <span className="slot-number">{i + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flip-back">
                <img src={targetDataUrl} alt="Solved Puzzle" className="solved-image" />
              </div>
            </div>
          </div>
          {phase === 'locked' && <div className="locked-overlay-text">UI FAMILIARIZATION PHASE. PIECES ARE LOCKED.</div>}
        </div>

        <div 
          className="tray-wrapper"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDropTray}
        >
          <div className="tray-grid">
            {trayPieces.map((piece, i) => (
              <img 
                key={piece.id}
                src={piece.dataUrl} 
                alt="tray piece" 
                className="puzzle-piece"
                draggable={phase !== 'locked'}
                onDragStart={e => handleDragStart(e, piece, 'tray', i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JigsawPuzzle;
