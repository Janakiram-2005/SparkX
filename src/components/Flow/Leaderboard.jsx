import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './LandingPage.css'; // Reuse Stitch design system styles

const Leaderboard = () => {
  const [teams, setTeams] = useState([]);
  const [socket, setSocket] = useState(null);
  const [page, setPage] = useState(0);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/leaderboard`);
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const newSocket = io(import.meta.env.PROD ? '/sparkx' : 'http://localhost:5000', { path: '/sparkx/socket.io' });
    setSocket(newSocket);
    newSocket.emit('join_leaderboard');
    newSocket.on('team_update', () => fetchLeaderboard());
    newSocket.on('team_completed', () => fetchLeaderboard());
    newSocket.on('all_teams_reset', () => fetchLeaderboard());
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => {
    if (teams.length <= 10) return;
    const interval = setInterval(() => {
      setPage(prev => {
        const maxPage = Math.ceil(teams.length / 10) - 1;
        return prev >= maxPage ? 0 : prev + 1;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [teams]);

  const displayedTeams = teams.slice(page * 10, page * 10 + 10);
  const leftColumn = displayedTeams.slice(0, 5);
  const rightColumn = displayedTeams.slice(5, 10);

  const renderTeamCard = (t, indexOffset) => {
    const isCompleted = t.status === 'completed';
    const isSolving = t.status === 'started';
    const globalRank = (page * 10) + indexOffset + 1;
    
    return (
      <div key={t._id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', gap: '1rem', transition: 'all 0.3s', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: globalRank <= 3 ? 'var(--stitch-tertiary)' : 'var(--stitch-text-dim)', minWidth: '70px' }}>
          #{globalRank}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px' }}>{t.team_name}</h3>
            {isCompleted ? (
              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(168, 85, 247, 0.2)', color: 'var(--stitch-primary-light)', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono', letterSpacing: '1px' }}>COMPLETED</span>
            ) : isSolving ? (
              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(76, 215, 246, 0.2)', color: 'var(--stitch-tertiary)', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono', letterSpacing: '1px' }}>SOLVING</span>
            ) : (
              <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--stitch-text-dim)', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono', letterSpacing: '1px' }}>WAITING</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${t.jigsaw_progress || 0}%`, height: '100%', background: 'linear-gradient(90deg, var(--stitch-primary), var(--stitch-tertiary))', transition: 'width 0.5s ease-out' }}></div>
            </div>
            <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--stitch-tertiary)', fontSize: '1rem', fontWeight: 'bold' }}>{t.jigsaw_progress || 0}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="stitch-layout" style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="stitch-bg"></div>
      <canvas id="bg-canvas-leaderboard" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}></canvas>

      <header style={{ position: 'relative', zIndex: 10, textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="hero-title" style={{ fontSize: '3rem', margin: 0 }}>
          LIVE <span style={{ color: 'var(--stitch-tertiary)' }}>LEADERBOARD</span>
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          <span style={{ color: 'var(--stitch-text-dim)', fontFamily: 'JetBrains Mono' }}>
            PAGE {page + 1} OF {Math.max(1, Math.ceil(teams.length / 10))}
          </span>
          {teams.length > 10 && <span style={{ color: 'var(--stitch-primary)', fontFamily: 'JetBrains Mono' }}>(AUTO-UPDATING)</span>}
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto' }}>
        {teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--stitch-text-dim)', fontSize: '1.5rem', fontFamily: 'JetBrains Mono' }}>
            WAITING FOR TEAMS...
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              {leftColumn.map((t, i) => renderTeamCard(t, i))}
            </div>
            <div style={{ flex: 1 }}>
              {rightColumn.map((t, i) => renderTeamCard(t, i + 5))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
