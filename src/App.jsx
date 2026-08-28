import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import IntroAnimation from './components/IntroAnimation';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminLogin from './components/Admin/AdminLogin';
import AddTeamPage from './components/Admin/AddTeamPage';
import LandingPage from './components/Flow/LandingPage';
import Login from './components/Flow/Login';
import RoundInstructions from './components/Flow/RoundInstructions';
import JigsawPuzzle from './components/Flow/JigsawPuzzle';
import ResultsReveal from './components/Flow/ResultsReveal';
import FeedbackForm from './components/Flow/FeedbackForm';
import RoundTwo from './components/Flow/RoundTwo';
import Leaderboard from './components/Flow/Leaderboard';
import SpotRegistration from './components/Flow/SpotRegistration';
import PostRoundWaitingRoom from './components/Flow/PostRoundWaitingRoom';

function App() {
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [team, setTeam] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState(() => sessionStorage.getItem('introSeen') === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    // Check admin token expiry (1 hour = 3600000 ms)
    const adminToken = sessionStorage.getItem('adminToken');
    if (adminToken) {
      if (Date.now() - parseInt(adminToken) < 3600000) {
        setAdminAuthenticated(true);
      } else {
        sessionStorage.removeItem('adminToken');
      }
    }

    const verifySession = async () => {
      const sessionData = localStorage.getItem('sparkx_session');
      if (sessionData) {
        try {
          const { ai_id, sessionToken } = JSON.parse(sessionData);
          const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ai_id, sessionToken })
          });
          const data = await res.json();
          if (data.success && !data.team.disqualified) {
            setTeam(data.team);
            if (data.isRound2 && window.location.pathname !== '/round2' && window.location.pathname !== '/adminsparkx1') {
              navigate('/round2');
            } else if (data.team.status === 'completed' && window.location.pathname !== '/waiting' && window.location.pathname !== '/adminsparkx1') {
              navigate('/waiting');
            }
          } else {
            localStorage.removeItem('sparkx_session');
          }
        } catch (e) {
          console.error("Session verification failed");
        }
      }
      setIsVerifying(false);
    };
    verifySession();
  }, []);

  useEffect(() => {
    if (location.hash === '##') {
      sessionStorage.removeItem('introSeen');
      setHasSeenIntro(false);
      navigate('/intro');
    }
  }, [location, navigate]);

  if (isVerifying) {
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0B0A16', color: '#fff' }}><h2>Verifying session...</h2></div>;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={
          hasSeenIntro ? <LandingPage /> : <Navigate to="/intro" />
        } />
        
        <Route path="/intro" element={
          <IntroAnimation onComplete={() => {
            sessionStorage.setItem('introSeen', 'true');
            setHasSeenIntro(true);
            navigate('/');
          }} />
        } />

        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/spot" element={<SpotRegistration />} />

        <Route path="/login" element={
          <Login onLoginSuccess={(t, isRound2) => {
            setTeam(t);
            if (isRound2) {
              navigate('/round2');
            } else if (t.status === 'completed') {
              navigate('/waiting');
            } else {
              navigate('/instructions');
            }
          }} />
        } />
        
        <Route path="/adminsparkx1" element={
          adminAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin onAuthSuccess={() => setAdminAuthenticated(true)} />
        } />
        <Route path="/admin/dashboard" element={adminAuthenticated ? <AdminDashboard /> : <Navigate to="/adminsparkx1" />} />
        <Route path="/admin/add-team" element={adminAuthenticated ? <AddTeamPage /> : <Navigate to="/adminsparkx1" />} />

        {/* PROTECTED ROUTES */}
        <Route path="/instructions" element={
          team ? <RoundInstructions team={team} onStartExam={() => navigate('/puzzle')} /> : <Navigate to="/login" replace />
        } />

        <Route path="/puzzle" element={
          team ? <JigsawPuzzle team={team} onComplete={() => navigate('/results')} /> : <Navigate to="/login" replace />
        } />

        <Route path="/results" element={
          team ? <ResultsReveal team={team} onNext={() => navigate('/feedback')} /> : <Navigate to="/login" replace />
        } />

        <Route path="/feedback" element={
          team ? <FeedbackForm team={team} onComplete={() => navigate('/waiting')} /> : <Navigate to="/login" replace />
        } />
        
        <Route path="/waiting" element={
          team ? <PostRoundWaitingRoom team={team} /> : <Navigate to="/login" replace />
        } />
        
        <Route path="/round2" element={
          team ? <RoundTwo team={team} /> : <Navigate to="/login" replace />
        } />

        {/* Global 404 Route */}
        <Route path="*" element={
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0B0A16', color: '#fff' }}>
            <h1 style={{ fontSize: '6rem', color: '#ef4444', margin: 0, textShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>404</h1>
            <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>System Node Not Found</h2>
            <p style={{ marginBottom: '2rem', color: '#94a3b8' }}>The sector you are trying to access does not exist or has been restricted.</p>
            <button className="btn-primary" onClick={() => navigate('/')}>Return to Base</button>
          </div>
        } />
      </Routes>
    </>
  );
}

export default App;
