import { useNavigate } from 'react-router-dom';
import { DEFAULT_DATABASE } from '../../../database';

const ResultsReveal = ({ team, onContinue }) => {
  const navigate = useNavigate();
  
  const assignedIdx = team.assignedPuzzleIndex !== undefined && team.assignedPuzzleIndex > -1 
    ? team.assignedPuzzleIndex 
    : 0;
  const puzzleData = DEFAULT_DATABASE[assignedIdx];

  return (
    <div className="flow-container">
      <div className="login-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
        <div className="login-header">
          <h2 style={{ color: '#10b981' }}>Puzzle Complete!</h2>
          <p>Congratulations {team.team_name}, you have solved the puzzle.</p>
        </div>
        
        <div style={{ padding: '2rem', background: '#f1f5f9', borderRadius: '12px', margin: '2rem 0' }}>
          <h3 style={{ margin: 0, color: '#1e293b' }}>Please wait for the next phase to begin.</h3>
        </div>

        {team.qualifiedForRound2 ? (
          <button className="btn-primary-flow" onClick={() => navigate('/round2')} style={{ width: '100%', background: '#a855f7' }}>
            Enter Round 2 Waiting Room
          </button>
        ) : (
          <button className="btn-primary-flow" onClick={() => {
            localStorage.removeItem('sparkx_session');
            window.location.href = '/login';
          }} style={{ width: '100%', background: '#ef4444', borderColor: '#ef4444' }}>
            Logout / Return to Home
          </button>
        )}
      </div>
    </div>
  );
};

export default ResultsReveal;
