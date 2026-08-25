import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import IntroAnimation from './components/IntroAnimation';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminLogin from './components/Admin/AdminLogin';
import LandingPage from './components/Flow/LandingPage';
import Login from './components/Flow/Login';
import RoundInstructions from './components/Flow/RoundInstructions';
import JigsawPuzzle from './components/Flow/JigsawPuzzle';
import ResultsReveal from './components/Flow/ResultsReveal';
import FeedbackForm from './components/Flow/FeedbackForm';
import RoundTwo from './components/Flow/RoundTwo';
function App() {
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [team, setTeam] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasSeenIntro, setHasSeenIntro] = useState(() => sessionStorage.getItem('introSeen') === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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

        <Route path="/login" element={
          <Login onLoginSuccess={(t) => {
            setTeam(t);
            navigate('/instructions');
          }} />
        } />
        
        <Route path="/adminsparkx1" element={
          adminAuthenticated ? <AdminDashboard /> : <AdminLogin onAuthSuccess={() => setAdminAuthenticated(true)} />
        } />

        {/* PROTECTED ROUTES */}
        <Route path="/instructions" element={
          team ? <RoundInstructions onStartExam={() => navigate('/puzzle')} /> : <Navigate to="/login" replace />
        } />

        <Route path="/puzzle" element={
          team ? <JigsawPuzzle team={team} onComplete={() => navigate('/results')} /> : <Navigate to="/login" replace />
        } />

        <Route path="/results" element={
          team ? <ResultsReveal team={team} onNext={() => navigate('/feedback')} /> : <Navigate to="/login" replace />
        } />

        <Route path="/feedback" element={
          team ? <FeedbackForm team={team} /> : <Navigate to="/login" replace />
        } />
        
        <Route path="/round2" element={
          team ? <RoundTwo team={team} /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </>
  );
}

export default App;
