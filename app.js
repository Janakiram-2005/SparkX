import { getDatabase, findTeam, saveDatabase, resetDatabase } from './database.js';

// Application State
const state = {
  currentScreen: 'landing', // landing | welcome | team | puzzle | problem
  selectedTeam: null,
  database: [],
  timerInterval: null,
  secondsRemaining: 600, // 10 minutes total
  elapsedSeconds: 0,
  finalScore: 10,
  timeTakenFormatted: '00:00',
  
  // Jigsaw Puzzle State (6x6 Grid = 36 Pieces)
  jigsaw: {
    gridRows: 6,
    gridCols: 6,
    totalPieces: 36,
    masterCanvas: null,
    targetDataUrl: '',
    pieces: [], // Master list of 36 piece objects
    boardSlots: Array(36).fill(null), // What piece is in slot 0..35
    trayPieces: [], // Pieces currently in the tray
    selectedPiece: null, // Currently selected piece object {pieceId, source: 'tray'|'board', slotIndex}
    matchedCount: 0
  }
};

// DOM Elements
const screens = {
  landing: document.getElementById('screen-landing'),
  welcome: document.getElementById('screen-welcome'),
  team: document.getElementById('screen-team'),
  puzzle: document.getElementById('screen-puzzle'),
  problem: document.getElementById('screen-problem')
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  state.database = getDatabase();
  initCanvasBackground();
  initLandingPageAnimation();
  bindEvents();
  switchScreen('landing');
});

// Landing Page SVG & Scroll Animations
function initLandingPageAnimation() {
  // Spoke marks around hero core
  const spokes = document.getElementById('spokes');
  if (spokes) {
    spokes.innerHTML = '';
    const n = 12;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const x1 = 110 + Math.cos(angle) * 70, y1 = 110 + Math.sin(angle) * 70;
      const x2 = 110 + Math.cos(angle) * 80, y2 = 110 + Math.sin(angle) * 80;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1); line.setAttribute('y1', y1);
      line.setAttribute('x2', x2); line.setAttribute('y2', y2);
      line.setAttribute('stroke', i % 3 === 0 ? 'var(--orange)' : 'var(--violet)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', i % 3 === 0 ? '0.9' : '0.4');
      spokes.appendChild(line);
    }
  }

  // Faint background circuit paths
  const bg = document.getElementById('bgCircuit');
  if (bg) {
    bg.innerHTML = '';
    const bw = window.innerWidth, bh = document.body.scrollHeight || 3000;
    bg.setAttribute('viewBox', `0 0 ${bw} ${bh}`);
    bg.setAttribute('width', bw); bg.setAttribute('height', bh);
    const paths = 6;
    for (let i = 0; i < paths; i++) {
      const y = (bh / paths) * i + Math.random() * 80;
      const x0 = Math.random() * bw * 0.3;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${x0} ${y} L ${x0 + 120} ${y} L ${x0 + 160} ${y + 40} L ${x0 + 320} ${y + 40}`;
      p.setAttribute('d', d);
      p.setAttribute('stroke', i % 2 === 0 ? '#7C4DFF' : '#FF6A2B');
      p.setAttribute('stroke-width', '1');
      p.setAttribute('fill', 'none');
      p.setAttribute('opacity', '0.10');
      bg.appendChild(p);
    }
  }

  // Pulse line animation
  const pulseLine = document.getElementById('pulseLine');
  if (pulseLine) {
    let t = 0;
    function animatePulse() {
      t += 0.006;
      if (t > 1) t = 0;
      const x1 = 34, x2 = 866;
      const headX = x1 + (x2 - x1) * t;
      const tailX = Math.max(x1, headX - 90);
      pulseLine.setAttribute('x1', tailX);
      pulseLine.setAttribute('x2', headX);
      requestAnimationFrame(animatePulse);
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(animatePulse);
    }
  }

  // Scroll reveal
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(el => io.observe(el));
  }
}

// Canvas Particle Background Animation
function initCanvasBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 45 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 2 + 1,
    color: Math.random() > 0.5 ? '#a855f7' : '#ff6600',
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    alpha: Math.random() * 0.5 + 0.2
  }));

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 10;
      ctx.shadowColor = p.color;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  animate();
}

// Navigation & Screen Control
function switchScreen(screenName) {
  const outerFrame = document.querySelector('.outer-frame');

  if (screenName === 'landing') {
    if (screens.landing) screens.landing.classList.add('active');
    if (outerFrame) outerFrame.classList.remove('active');
    Object.keys(screens).forEach(key => {
      if (key !== 'landing' && screens[key]) screens[key].classList.remove('active');
    });
  } else {
    if (screens.landing) screens.landing.classList.remove('active');
    if (outerFrame) outerFrame.classList.add('active');
    Object.keys(screens).forEach(key => {
      if (key !== 'landing' && screens[key]) {
        if (key === screenName) {
          screens[key].classList.add('active');
        } else {
          screens[key].classList.remove('active');
        }
      }
    });
  }

  state.currentScreen = screenName;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // If leaving puzzle screen, stop timer
  if (screenName !== 'puzzle' && state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// Event Bindings
function bindEvents() {
  // Landing Page Buttons -> Launch Main Project / Team Selection
  const landingBtns = document.querySelectorAll('.landing-start-btn');
  landingBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      switchScreen('team');
    });
  });

  // Header Logo -> Return to Landing Page
  const headerLogo = document.getElementById('header-logo');
  if (headerLogo) {
    headerLogo.addEventListener('click', () => {
      switchScreen('landing');
    });
  }

  // Welcome Screen -> Team Screen
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      switchScreen('team');
    });
  }

  // Verify Team Entry
  document.getElementById('verify-team-btn').addEventListener('click', () => {
    const val = document.getElementById('team-number-input').value.trim();
    handleTeamVerification(val);
  });

  document.getElementById('team-number-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const val = e.target.value.trim();
      handleTeamVerification(val);
    }
  });

  // Back Button from Puzzle to Team Selection
  document.getElementById('back-to-teams-btn').addEventListener('click', () => {
    switchScreen('team');
  });

  // Reset / Change Team from Problem Statement
  document.getElementById('reset-flow-btn').addEventListener('click', () => {
    switchScreen('team');
  });

  // Copy Problem Statement
  document.getElementById('copy-ps-btn').addEventListener('click', copyProblemStatement);

  // Jigsaw Toolbar Buttons
  document.getElementById('jigsaw-ref-btn').addEventListener('click', toggleReferenceModal);
  document.getElementById('close-ref-modal').addEventListener('click', toggleReferenceModal);
}

// Verification Logic
function handleTeamVerification(inputTeamId) {
  if (!inputTeamId) {
    showToast('Please enter a Team Number (1 - 50)', 'error');
    return;
  }

  const team = findTeam(inputTeamId);
  if (!team) {
    showToast(`Team "${inputTeamId}" not found in database! Try Team numbers 1 to 50.`, 'error');
    return;
  }

  state.selectedTeam = team;
  initJigsawPuzzle(team);
  switchScreen('puzzle');
  startPuzzleTimer();
  showToast(`Welcome ${team.teamName}! 49-Piece Jigsaw Challenge Initialized!`, 'success');

  // Sync login to MongoDB backend
  fetch('/api/teams/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId: team.id, teamName: team.teamName })
  }).catch(() => {});
}

// 10-Minute Countdown Timer & Points Calculator
function startPuzzleTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);

  state.secondsRemaining = 600; // 10 minutes = 600s
  state.elapsedSeconds = 0;
  state.finalScore = 10;

  const timerText = document.getElementById('puzzle-timer-text');
  const pointsText = document.getElementById('puzzle-points-text');
  const timerBadge = document.getElementById('timer-badge');

  timerBadge.classList.remove('warning');
  updateTimerUI();

  state.timerInterval = setInterval(() => {
    state.secondsRemaining--;
    state.elapsedSeconds++;

    updateTimerUI();

    if (state.secondsRemaining <= 0) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
      state.secondsRemaining = 0;
      state.finalScore = 0;
      timerText.textContent = '00:00';
      pointsText.textContent = '0 PTS';
      showToast("Time's Up! You get 0 points for this puzzle.", 'error');
    }
  }, 1000);

  function updateTimerUI() {
    const mins = Math.floor(state.secondsRemaining / 60);
    const secs = state.secondsRemaining % 60;
    const formattedStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerText.textContent = formattedStr;

    if (state.secondsRemaining <= 0) {
      state.finalScore = 0;
    } else {
      const minSlot = Math.floor((state.elapsedSeconds) / 60);
      state.finalScore = Math.max(1, 10 - minSlot);
    }
    pointsText.textContent = `${state.finalScore} PTS`;

    if (state.secondsRemaining <= 60) {
      timerBadge.classList.add('warning');
    } else {
      timerBadge.classList.remove('warning');
    }
  }
}

function stopPuzzleTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  const mins = Math.floor(state.elapsedSeconds / 60);
  const secs = state.elapsedSeconds % 60;
  state.timeTakenFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/* ==========================================================================
   36-PIECE JIGSAW PUZZLE ENGINE (6x6 GRID & PROCEDURAL AI AGENTIC GRAPHICS)
   ========================================================================== */

function initJigsawPuzzle(team) {
  document.getElementById('current-team-badge').textContent = `TEAM #${team.id}`;
  document.getElementById('jigsaw-title').textContent = team.puzzle?.title || `AI AGENTIC JIGSAW #`;
  document.getElementById('jigsaw-subtitle').textContent = team.puzzle?.subtitle || `Assemble 36 pieces of the ${team.puzzle?.theme || 'AI Agent'}`;

  // Generate Master Target Graphic (720x720 px for 6x6 division, 120px per tile)
  const masterCanvas = generateAIAgenticImage(team);
  state.jigsaw.masterCanvas = masterCanvas;
  state.jigsaw.targetDataUrl = masterCanvas.toDataURL('image/png');

  // Populate reference modal image container
  const refContainer = document.getElementById('ref-image-preview-container');
  refContainer.innerHTML = '';
  const refImg = document.createElement('img');
  refImg.src = state.jigsaw.targetDataUrl;
  refImg.className = 'ref-master-img';
  refContainer.appendChild(refImg);

  // Slice into 36 Pieces (6 rows x 6 cols = 36 pieces, each 120x120 px)
  const pieces = [];
  const tileSize = 120; // 720 / 6 = 120
  
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const index = r * 6 + c;
      
      // Create slice canvas
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = tileSize;
      tileCanvas.height = tileSize;
      const ctx = tileCanvas.getContext('2d');

      // Draw the exact slice from master image
      ctx.drawImage(masterCanvas, c * tileSize, r * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);

      // Add subtle inner border & bevel effect for puzzle piece realistic look
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, tileSize, tileSize);

      pieces.push({
        id: index,
        row: r,
        col: c,
        dataUrl: tileCanvas.toDataURL('image/png')
      });
    }
  }

  state.jigsaw.pieces = pieces;
  state.jigsaw.boardSlots = Array(36).fill(null);
  state.jigsaw.selectedPiece = null;

  // Shuffle pieces into tray initially
  const shuffled = [...pieces].sort(() => Math.random() - 0.5);
  state.jigsaw.trayPieces = shuffled;

  renderJigsawBoard();
  renderJigsawTray();
  updateJigsawProgress();
}

// Generate 100% Unique High-Tech AI Agentic Image per Team (50 Unique Palettes & Geometries)
function generateAIAgenticImage(team) {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');

  const teamId = parseInt(team.id, 10) || 1;
  const themeName = team.puzzle?.theme || `AI Agentic System #${teamId}`;

  // 50 Curated Dual Accent Color Palettes for 50 Teams
  const palettes = [
    { primary: '#a855f7', secondary: '#d946ef', bgInner: '#1e0938' }, // 1: Cyber Security Purple
    { primary: '#06b6d4', secondary: '#38bdf8', bgInner: '#06202e' }, // 2: Medical Cyan
    { primary: '#3b82f6', secondary: '#60a5fa', bgInner: '#0a1936' }, // 3: Learning Blue
    { primary: '#22c55e', secondary: '#4ade80', bgInner: '#062812' }, // 4: AgriTech Green
    { primary: '#f59e0b', secondary: '#fbbf24', bgInner: '#2e1c03' }, // 5: FinTech Gold
    { primary: '#ec4899', secondary: '#f472b6', bgInner: '#33081e' }, // 6: Logistics Magenta
    { primary: '#10b981', secondary: '#34d399', bgInner: '#04271c' }, // 7: Energy Emerald
    { primary: '#8b5cf6', secondary: '#c084fc', bgInner: '#1b0e3d' }, // 8: Assistive Violet
    { primary: '#ef4444', secondary: '#f87171', bgInner: '#330808' }, // 9: Disaster Red
    { primary: '#f97316', secondary: '#fb923c', bgInner: '#331304' }, // 10: Swarm Orange
    { primary: '#6366f1', secondary: '#818cf8', bgInner: '#13153b' }, // 11: Legal Indigo
    { primary: '#14b8a6', secondary: '#2dd4bf', bgInner: '#042925' }, // 12: Financial Teal
    { primary: '#0284c7', secondary: '#38bdf8', bgInner: '#041d2e' }, // 13: Water Blue
    { primary: '#e11d48', secondary: '#fb7185', bgInner: '#33040e' }, // 14: Medical Rose
    { primary: '#9333ea', secondary: '#c084fc', bgInner: '#24063d' }, // 15: BioTech Purple
    { primary: '#ea580c', secondary: '#ffedd5', bgInner: '#3b1204' }, // 16: Drone Amber
    { primary: '#059669', secondary: '#6ee7b7', bgInner: '#042b1e' }, // 17: Audio Mint
    { primary: '#2563eb', secondary: '#93c5fd', bgInner: '#06173d' }, // 18: Smart City Blue
    { primary: '#7c3aed', secondary: '#ddd6fe', bgInner: '#1f0942' }, // 19: Gene Editing Violet
    { primary: '#dc2626', secondary: '#fca5a5', bgInner: '#380505' }, // 20: Cyber Threat Red
    { primary: '#d97706', secondary: '#fde68a', bgInner: '#361b03' }, // 21: Robotics Amber
    { primary: '#0891b2', secondary: '#a5f3fc', bgInner: '#04222b' }, // 22: Retention Cyan
    { primary: '#16a34a', secondary: '#bbf7d0', bgInner: '#052910' }, // 23: Climate Green
    { primary: '#db2777', secondary: '#fbcfe8', bgInner: '#36051b' }, // 24: Retail Pink
    { primary: '#0d9488', secondary: '#99f6e4', bgInner: '#032623' }, // 25: Factory Teal
    { primary: '#a855f7', secondary: '#e9d5ff', bgInner: '#290b42' }, // 26: Mental Health Purple
    { primary: '#3b82f6', secondary: '#bfdbfe', bgInner: '#081c3d' }, // 27: Quantum Blue
    { primary: '#e11d48', secondary: '#fecdd3', bgInner: '#3b0611' }, // 28: Surgical Red
    { primary: '#10b981', secondary: '#a7f3d0', bgInner: '#042c1d' }, // 29: Satellite Green
    { primary: '#f59e0b', secondary: '#fef08a', bgInner: '#362103' }, // 30: Grid Yellow
    { primary: '#4f46e5', secondary: '#c7d2fe', bgInner: '#100e3d' }, // 31: Deepfake Indigo
    { primary: '#c026d3', secondary: '#f5d0fe', bgInner: '#330538' }, // 32: Oncology Fuchsia
    { primary: '#0f766e', secondary: '#99f6e4', bgInner: '#02211e' }, // 33: Web3 Teal
    { primary: '#1d4ed8', secondary: '#bfdbfe', bgInner: '#061338' }, // 34: Space Blue
    { primary: '#15803d', secondary: '#bbf7d0', bgInner: '#04210e' }, // 35: Cold Chain Green
    { primary: '#0369a1', secondary: '#bae6fd', bgInner: '#021b2b' }, // 36: Thermal Blue
    { primary: '#047857', secondary: '#a7f3d0', bgInner: '#02241a' }, // 37: EV Fleet Emerald
    { primary: '#b91c1c', secondary: '#fca5a5', bgInner: '#360606' }, // 38: Video Detection Red
    { primary: '#6d28d9', secondary: '#ddd6fe', bgInner: '#1b073b' }, // 39: Insurance Purple
    { primary: '#c2410c', secondary: '#ffedd5', bgInner: '#360f03' }, // 40: Universal Swarm Orange
    { primary: '#f43f5e', secondary: '#fda4af', bgInner: '#330612' }, // 41: Quantum Rose
    { primary: '#84cc16', secondary: '#d9f99d', bgInner: '#1a2e05' }, // 42: Edge IoT Lime
    { primary: '#0ea5e9', secondary: '#bae6fd', bgInner: '#032030' }, // 43: Neuromorphic Sky
    { primary: '#a855f7', secondary: '#f5d0fe', bgInner: '#29063b' }, // 44: Orbital Purple
    { primary: '#f97316', secondary: '#ffedd5', bgInner: '#381204' }, // 45: Logistics Orange
    { primary: '#10b981', secondary: '#d1fae5', bgInner: '#04291c' }, // 46: Genomics Emerald
    { primary: '#eab308', secondary: '#fef08a', bgInner: '#332604' }, // 47: Microgrid Amber
    { primary: '#ec4899', secondary: '#fbcfe8', bgInner: '#380620' }, // 48: Forensics Pink
    { primary: '#06b6d4', secondary: '#cffaff', bgInner: '#042730' }, // 49: Warehouse Cyan
    { primary: '#6366f1', secondary: '#e0e7ff', bgInner: '#12143b' }  // 50: Supercomputer Indigo
  ];

  const palette = palettes[(teamId - 1) % palettes.length];
  const primaryColor = palette.primary;
  const secondaryColor = palette.secondary;
  const bgInner = palette.bgInner;

  // 1. Dark Cyber Gradient Background tailored per team
  const bgGrad = ctx.createRadialGradient(360, 360, 30, 360, 360, 500);
  bgGrad.addColorStop(0, bgInner);
  bgGrad.addColorStop(0.6, '#080514');
  bgGrad.addColorStop(1, '#020106');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 720, 720);

  // 2. Background Grid / Matrix Style (5 unique geometric modes)
  const gridStyleMode = (teamId % 5);
  ctx.save();
  ctx.strokeStyle = primaryColor;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 1.5;

  if (gridStyleMode === 0) {
    // Hexagonal Grid
    const size = 45;
    for (let y = -20; y < 720; y += size * 1.5) {
      for (let x = -20; x < 720; x += size * Math.sqrt(3)) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          ctx.lineTo(x + size * Math.cos(angle), y + size * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  } else if (gridStyleMode === 1) {
    // Diagonal Cyber Rays & Crosshatch
    for (let i = -700; i < 1400; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i + 700, 700);
      ctx.moveTo(i, 700); ctx.lineTo(i + 700, 0);
      ctx.stroke();
    }
  } else if (gridStyleMode === 2) {
    // Concentric Radar Rings & Spoke Lines
    ctx.translate(350, 350);
    for (let r = 40; r <= 320; r += 40) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * 340, Math.sin(angle) * 340);
      ctx.stroke();
    }
  } else if (gridStyleMode === 3) {
    // Square Circuit Grid with Corner Nodes
    for (let i = 0; i <= 700; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 700);
      ctx.moveTo(0, i); ctx.lineTo(700, i);
      ctx.stroke();
    }
  } else {
    // Neural Spiral Particles
    ctx.translate(350, 350);
    for (let i = 0; i < 60; i++) {
      const angle = i * 0.3;
      const radius = i * 5;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 3. Central AI Agent Silhouette Avatar (5 Unique Modes based on teamId)
  ctx.save();
  ctx.translate(350, 350);

  const avatarMode = (teamId % 5);

  if (avatarMode === 0) {
    // --- MODE A: HIGH-TECH MECHA AGENT HELMET ---
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(0, 0, 180, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#171233';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(-90, -110, 180, 150, [30, 30, 20, 20]);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.shadowColor = secondaryColor;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.roundRect(-65, -60, 50, 22, 10);
    ctx.roundRect(15, -60, 50, 22, 10);
    ctx.fill();

    ctx.fillStyle = primaryColor;
    ctx.shadowColor = primaryColor;
    ctx.beginPath();
    ctx.arc(0, 85, 24, 0, Math.PI * 2);
    ctx.fill();

  } else if (avatarMode === 1) {
    // --- MODE B: COGNITIVE NEURAL SYNAPSE BRAIN ORB ---
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 30;
    
    ctx.beginPath(); ctx.ellipse(0, 0, 190, 80, Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 190, 80, -Math.PI / 4, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#1e1035';
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI * 2) / 12;
      const r = 55;
      ctx.fillStyle = secondaryColor;
      ctx.shadowColor = secondaryColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 8, 0, Math.PI * 2);
      ctx.fill();
    }

  } else if (avatarMode === 2) {
    // --- MODE C: QUANTUM AGENT HYPERCUBE & ENERGY MATRIX ---
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 30;

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.lineTo(160 * Math.cos(a), 160 * Math.sin(a));
    }
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -90); ctx.lineTo(90, 0); ctx.lineTo(0, 90); ctx.lineTo(-90, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = primaryColor;
    ctx.shadowColor = primaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

  } else if (avatarMode === 3) {
    // --- MODE D: MULTI-AGENT SATELLITE ORBITAL SWARM ---
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 3;
    ctx.shadowColor = secondaryColor;
    ctx.shadowBlur = 25;

    ctx.beginPath(); ctx.arc(0, 0, 160, 0, Math.PI * 2); ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + (teamId * 0.2);
      const sx = 160 * Math.cos(a);
      const sy = 160 * Math.sin(a);

      ctx.fillStyle = primaryColor;
      ctx.shadowColor = primaryColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(sx, sy, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

  } else {
    // --- MODE E: CYBERNETIC TRI-NODE INTELLIGENCE SHIELD ---
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 5;
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 30;

    ctx.beginPath();
    ctx.moveTo(0, -140);
    ctx.lineTo(140, 110);
    ctx.lineTo(-140, 110);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#130d2e';
    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const nodes = [[0, -140], [140, 110], [-140, 110]];
    nodes.forEach(([nx, ny]) => {
      ctx.fillStyle = secondaryColor;
      ctx.shadowColor = secondaryColor;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(nx, ny, 16, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();

  // 4. Team Label Header & Footer Banners
  ctx.fillStyle = 'rgba(10, 8, 22, 0.9)';
  ctx.fillRect(0, 0, 700, 75);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 30px "Space Grotesk", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 10;
  ctx.fillText(`AI SPARKX • TEAM ${team.id}`, 350, 48);

  ctx.fillStyle = 'rgba(10, 8, 22, 0.9)';
  ctx.fillRect(0, 615, 700, 85);

  ctx.fillStyle = primaryColor;
  ctx.font = '700 20px "Outfit", sans-serif';
  ctx.fillText(themeName.toUpperCase(), 350, 655);

  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 684, 684);

  return canvas;
}

// Render Target Assembly Board
function renderJigsawBoard() {
  const boardEl = document.getElementById('jigsaw-board');
  if (!boardEl) return;
  boardEl.innerHTML = '';

  const total = state.jigsaw.totalPieces || 36;
  const cols = state.jigsaw.gridCols || 6;

  for (let i = 0; i < total; i++) {
    const slot = document.createElement('div');
    slot.className = 'jigsaw-board-slot';
    slot.dataset.slotIndex = i;

    const row = Math.floor(i / cols);
    const col = i % cols;
    slot.dataset.row = row;
    slot.dataset.col = col;

    const piece = state.jigsaw.boardSlots[i];
    if (piece) {
      const pieceEl = createPieceElement(piece, 'board', i);
      
      // Highlight if correctly placed
      if (piece.id === i) {
        slot.classList.add('correct-slot');
      } else {
        slot.classList.remove('correct-slot');
      }

      slot.appendChild(pieceEl);
    } else {
      // Empty Slot Number Guide
      const label = document.createElement('span');
      label.className = 'slot-number';
      label.textContent = `${i + 1}`;
      slot.appendChild(label);
    }

    // Event handlers for slot selection/drop
    slot.addEventListener('click', () => handleSlotClick(i));
    slot.addEventListener('dragover', (e) => e.preventDefault());
    slot.addEventListener('drop', (e) => handleSlotDrop(e, i));

    boardEl.appendChild(slot);
  }
}

// Render Unplaced Piece Scrambled Tray
function renderJigsawTray() {
  const trayEl = document.getElementById('jigsaw-tray');
  const countEl = document.getElementById('tray-piece-count');
  if (!trayEl) return;
  
  trayEl.innerHTML = '';
  if (countEl) countEl.textContent = state.jigsaw.trayPieces.length;

  state.jigsaw.trayPieces.forEach((piece, index) => {
    const pieceEl = createPieceElement(piece, 'tray', index);
    trayEl.appendChild(pieceEl);
  });
}

// Create Piece DOM Element
function createPieceElement(piece, source, locationIndex) {
  const pieceEl = document.createElement('div');
  pieceEl.className = 'jigsaw-piece-tile';
  pieceEl.draggable = true;
  pieceEl.dataset.pieceId = piece.id;
  pieceEl.dataset.source = source;
  pieceEl.dataset.locationIndex = locationIndex;

  const img = document.createElement('img');
  img.src = piece.dataUrl;
  img.alt = `Piece ${piece.id + 1}`;
  pieceEl.appendChild(img);

  // Check if currently selected
  if (state.jigsaw.selectedPiece && state.jigsaw.selectedPiece.pieceId === piece.id) {
    pieceEl.classList.add('selected');
  }

  // Click handler to select
  pieceEl.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePieceClick(piece, source, locationIndex);
  });

  // Drag handler
  pieceEl.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      pieceId: piece.id,
      source: source,
      locationIndex: locationIndex
    }));
  });

  return pieceEl;
}

// Handle Piece Selection Click
function handlePieceClick(piece, source, locationIndex) {
  // If already selected, deselect
  if (state.jigsaw.selectedPiece && state.jigsaw.selectedPiece.pieceId === piece.id) {
    state.jigsaw.selectedPiece = null;
  } else {
    state.jigsaw.selectedPiece = {
      pieceId: piece.id,
      piece: piece,
      source: source,
      locationIndex: locationIndex
    };
  }

  renderJigsawBoard();
  renderJigsawTray();
}

// Handle Slot Click (Target for placing selected piece)
function handleSlotClick(targetSlotIndex) {
  const sel = state.jigsaw.selectedPiece;
  if (!sel) {
    // If slot has a piece, select it!
    const existing = state.jigsaw.boardSlots[targetSlotIndex];
    if (existing) {
      state.jigsaw.selectedPiece = {
        pieceId: existing.id,
        piece: existing,
        source: 'board',
        locationIndex: targetSlotIndex
      };
      renderJigsawBoard();
      renderJigsawTray();
    }
    return;
  }

  executeMovePiece(sel, targetSlotIndex);
}

// Handle HTML5 Drag & Drop
function handleSlotDrop(e, targetSlotIndex) {
  e.preventDefault();
  try {
    const rawData = e.dataTransfer.getData('text/plain');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    
    const pieceObj = state.jigsaw.pieces.find(p => p.id === data.pieceId);
    if (!pieceObj) return;

    executeMovePiece({
      pieceId: data.pieceId,
      piece: pieceObj,
      source: data.source,
      locationIndex: data.locationIndex
    }, targetSlotIndex);
  } catch (err) {
    console.error("Drop error", err);
  }
}

// Execute Piece Placement / Swap Logic
function executeMovePiece(sel, targetSlotIndex) {
  const existingTargetPiece = state.jigsaw.boardSlots[targetSlotIndex];

  if (sel.source === 'tray') {
    // Remove from tray
    const trayIndex = state.jigsaw.trayPieces.findIndex(p => p.id === sel.pieceId);
    if (trayIndex !== -1) {
      state.jigsaw.trayPieces.splice(trayIndex, 1);
    }

    // If target slot had a piece, return target piece to tray
    if (existingTargetPiece) {
      state.jigsaw.trayPieces.push(existingTargetPiece);
    }

    // Place selected piece in target slot
    state.jigsaw.boardSlots[targetSlotIndex] = sel.piece;

  } else if (sel.source === 'board') {
    const fromSlotIndex = sel.locationIndex;

    // Swap pieces on board
    state.jigsaw.boardSlots[fromSlotIndex] = existingTargetPiece;
    state.jigsaw.boardSlots[targetSlotIndex] = sel.piece;
  }

  state.jigsaw.selectedPiece = null;
  
  playSnapSound();
  renderJigsawBoard();
  renderJigsawTray();
  updateJigsawProgress();
}

// Check & Update Progress
function updateJigsawProgress() {
  let matched = 0;
  const total = state.jigsaw.totalPieces || 36;

  for (let i = 0; i < total; i++) {
    const piece = state.jigsaw.boardSlots[i];
    if (piece && piece.id === i) {
      matched++;
    }
  }

  state.jigsaw.matchedCount = matched;
  const pct = Math.round((matched / total) * 100);

  const matchedCountEl = document.getElementById('jigsaw-matched-count');
  const fillEl = document.getElementById('jigsaw-progress-fill');

  if (matchedCountEl) matchedCountEl.textContent = `${matched} / ${total} (${pct}%)`;
  if (fillEl) fillEl.style.width = `${pct}%`;

  // Check Victory Condition (All pieces correctly placed!)
  if (matched === total) {
    onJigsawVictory();
  }
}

// Victory Event when all pieces assembled!
function onJigsawVictory() {
  stopPuzzleTimer();
  playSuccessSound();
  triggerConfetti();

  const total = state.jigsaw.totalPieces || 36;
  showToast(`CONGRATULATIONS! ${total}/${total} PIECES MATCHED IN ${state.timeTakenFormatted}! (+${state.finalScore} PTS)`, 'success');

  // Sync Completion & Points to MongoDB Backend
  fetch('/api/teams/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId: state.selectedTeam.id,
      teamName: state.selectedTeam.teamName,
      points: state.finalScore,
      timeTakenSeconds: state.elapsedSeconds,
      timeTakenFormatted: state.timeTakenFormatted,
      matchedPieces: 36,
      problemStatementId: state.selectedTeam.problemStatement?.id || `PS-${state.selectedTeam.id}`,
      problemTitle: state.selectedTeam.problemStatement?.title || ''
    })
  }).catch(() => {});

  setTimeout(() => {
    populateProblemScreen(state.selectedTeam);
    switchScreen('problem');
  }, 1200);
}

// Tool Button Handlers
function toggleReferenceModal() {
  const modal = document.getElementById('ref-image-modal');
  modal.classList.toggle('hidden');
}

// Audio Snap Sound Effect
function playSnapSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch (e) {}
}

// Populate Problem Screen
function populateProblemScreen(team) {
  const ps = team.problemStatement;
  if (!ps) return;

  document.getElementById('celebrate-heading').textContent = `Awesome Job, Team #${team.id}!`;
  document.getElementById('celebrate-text').textContent = `You completed the 49-piece Jigsaw Challenge in ${state.timeTakenFormatted} and earned ${state.finalScore} Points! Here is your official problem statement for AI SPARKX.`;

  document.getElementById('ps-id').textContent = ps.id || `PS-${team.id}`;
  document.getElementById('ps-score').innerHTML = `<i class="fa-solid fa-trophy"></i> SCORE: ${state.finalScore} / 10 PTS`;
  document.getElementById('ps-time').innerHTML = `<i class="fa-solid fa-clock"></i> Solved in ${state.timeTakenFormatted}`;
  document.getElementById('ps-domain').textContent = `Domain: ${ps.domain || 'Tech'}`;
  document.getElementById('ps-track').textContent = `Track: ${ps.track || 'AI'}`;
  document.getElementById('ps-title').textContent = ps.title || 'Problem Statement Title';
  document.getElementById('ps-description').textContent = ps.description || 'No description available.';

  // Objectives List
  const objList = document.getElementById('ps-objectives');
  objList.innerHTML = '';
  (ps.objectives || ['Develop a working application', 'User friendly UI', 'Demonstrate clear pitch']).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    objList.appendChild(li);
  });

  // Deliverables List
  const delList = document.getElementById('ps-deliverables');
  delList.innerHTML = '';
  (ps.deliverables || ['Web Prototype', 'Source Code Repository', 'Presentation Slides']).forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    delList.appendChild(li);
  });
}

// Copy & Download Utilities
function copyProblemStatement() {
  if (!state.selectedTeam) return;
  const ps = state.selectedTeam.problemStatement;
  const text = `
AI SPARKX - PROBLEM STATEMENT (${ps.id})
Team: ${state.selectedTeam.teamName} (Team ${state.selectedTeam.id})
Score Achieved: ${state.finalScore}/10 PTS (Solved in ${state.timeTakenFormatted})
Title: ${ps.title}
Domain: ${ps.domain} | Track: ${ps.track}

Description:
${ps.description}

Key Objectives:
${(ps.objectives || []).map(o => '- ' + o).join('\n')}

Expected Deliverables:
${(ps.deliverables || []).map(d => '- ' + d).join('\n')}
  `.trim();

  navigator.clipboard.writeText(text).then(() => {
    showToast('Problem Statement & Score copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy to clipboard', 'error');
  });
}

function downloadProblemStatementText() {
  if (!state.selectedTeam) return;
  const ps = state.selectedTeam.problemStatement;
  const text = `=====================================================
AI SPARKX HACKATHON - OFFICIAL PROBLEM STATEMENT
=====================================================

Team ID: ${state.selectedTeam.id}
Team Name: ${state.selectedTeam.teamName}
Score Earned: ${state.finalScore} / 10 Points
Time Taken: ${state.timeTakenFormatted}
Problem Code: ${ps.id}
Domain: ${ps.domain}
Track: ${ps.track}

TITLE: ${ps.title}

DESCRIPTION:
${ps.description}

OBJECTIVES:
${(ps.objectives || []).map(o => '  * ' + o).join('\n')}

DELIVERABLES:
${(ps.deliverables || []).map(d => '  * ' + d).join('\n')}

Good luck for AI SPARKX!
=====================================================`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `AI_SPARKX_Team_${state.selectedTeam.id}_ProblemStatement.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Summary downloaded!', 'success');
}

// Audio Synth Effect
function playSuccessSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  } catch (e) {
    console.log('Web Audio disabled', e);
  }
}

// Victory Confetti Animation
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ff6600', '#22c55e', '#ffffff', '#06b6d4']
    });
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
