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
  const [hasSeenIntro, setHasSeenIntro] = useState(() => sessionStorage.getItem('introSeen') === 'true');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '##') {
      sessionStorage.removeItem('introSeen');
      setHasSeenIntro(false);
      navigate('/intro');
    }
  }, [location, navigate]);

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
