import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [file, setFile] = useState(null);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isRound2Active, setIsRound2Active] = useState(false);
  const [isResultsAnnounced, setIsResultsAnnounced] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [round2TimerInput, setRound2TimerInput] = useState(45);
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cutoff, setCutoff] = useState(20);
  
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [alerts, setAlerts] = useState([]);

  const [editingTeam, setEditingTeam] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const newSocket = io(import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000', { path: '/sparkx/socket.io' });
    setSocket(newSocket);

    newSocket.emit('join_admin');

    newSocket.on('team_progress_update', ({ teamId, progress, status }) => {
      setTeams(prev => prev.map(t => 
        t.id === parseInt(teamId) || t._id === teamId
          ? { ...t, jigsaw_progress: progress, status: status || t.status } 
          : t
      ));
    });

    newSocket.on('team_completed', ({ teamId, score }) => {
      setTeams(prev => prev.map(t => 
        t.id === parseInt(teamId) || t._id === teamId
          ? { ...t, status: 'completed', score: score } 
          : t
      ));
    });

    newSocket.on('team_promotion_update', ({ teamId, qualifiedForRound2 }) => {
      setTeams(prev => prev.map(t => 
        t.id === teamId || t._id === teamId || t.id === parseInt(teamId)
          ? { ...t, qualifiedForRound2 } 
          : t
      ));
    });

    newSocket.on('state_changed', ({ round1_active, round2_active, results_announced }) => {
      if (round1_active !== undefined) setIsRoundActive(round1_active);
      if (round2_active !== undefined) setIsRound2Active(round2_active);
      if (results_announced !== undefined) setIsResultsAnnounced(results_announced);
    });
    
    newSocket.on('round2_state_update', ({ active, endTime }) => {
      setIsRound2Active(active);
    });
    
    newSocket.on('global_state_update', (state) => {
      if (state.results_announced !== undefined) setIsResultsAnnounced(state.results_announced);
    });

    newSocket.on('team_update', (updatedTeam) => {
      if (!updatedTeam) fetchTeams(); // fallback
      else setTeams(prev => prev.map(t => t._id === updatedTeam._id ? updatedTeam : t));
    });

    newSocket.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev]);
    });

    newSocket.on('alert_resolved', ({ alertId }) => {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    });

    fetchState();
    fetchTeams();
    fetchAlerts();

    return () => newSocket.disconnect();
  }, []);

  const fetchTeams = async () => {
    const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams`);
    const data = await res.json();
    if (data.success) setTeams(data.teams);
  };

  const fetchState = async () => {
    const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/state`);
    const data = await res.json();
    if (data.success && data.state) {
      setIsRoundActive(Boolean(data.state.round1_active));
      setIsRound2Active(Boolean(data.state.round2_active));
      setIsResultsAnnounced(Boolean(data.state.results_announced));
    }
  };

  const fetchAlerts = async () => {
    const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/alerts`);
    const data = await res.json();
    if (data.success) setAlerts(data.alerts);
  };

  const resolveAlert = (alertId) => {
    if (socket) socket.emit('resolve_alert', { alertId });
  };

  useEffect(() => {
    if (file) handleFileUpload();
  }, [file]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    window.location.href = '/';
  };

  const handleFileUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (data.duplicates && data.duplicates.length > 0) {
          const dupesList = data.duplicates.map(d => `${d.teamName} (ID: ${d.aiId})`).join('\n');
          alert(`${data.message}\n\nWARNING: The following teams were skipped because their ID already exists in the system:\n${dupesList}`);
        } else {
          alert(data.message);
        }
        fetchTeams();
      } else {
        alert(data.message || 'Upload failed');
      }
    } catch (err) {
      alert('Upload failed due to network error');
    } finally {
      setIsUploading(false);
      setFile(null);
      if (document.getElementById('upload-excel')) {
        document.getElementById('upload-excel').value = '';
      }
    }
  };

  const syncGoogleSheet = async () => {
    const defaultUrl = "https://docs.google.com/spreadsheets/d/1B40eq5EIED5jxflUL78PrA50VjRgBoGknlFSzW5JWrk/export?format=csv&gid=2045460177";
    const url = prompt("Verify the Google Sheet CSV URL (Make sure the sheet is shared as 'Anyone with the link can view'):", defaultUrl);
    if (!url) return;
    
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('sheetUrl', url);
      formData.append('securityKey', localStorage.getItem('adminKey'));
      
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/sync-sheet`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTeams();
      } else {
        alert(data.message || 'Error syncing from Google Sheet.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while syncing.');
    } finally {
      setIsUploading(false);
    }
  };

  const seedData = async () => {
    if(!window.confirm('Seed database with temporary teams?')) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/seed`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTeams();
      }
    } catch (err) {
      alert('Seeding failed');
    }
  };

  const downloadTemplate = () => {
    import('xlsx').then(xlsx => {
      const templateData = [{
        'Team Name': '',
        'Registration Number': '',
        'Login ID': '',
        'Password': '',
        'Member 1 Name': '',
        'Member 1 AI ID': '',
        'Member 1 RegNo': '',
        'Member 1 Email': '',
        'Member 1 Phone': '',
        'Member 2 Name': '',
        'Member 2 AI ID': '',
        'Member 2 RegNo': '',
        'Member 2 Email': '',
        'Member 2 Phone': '',
        'Member 3 Name': '',
        'Member 3 AI ID': '',
        'Member 3 RegNo': '',
        'Member 3 Email': '',
        'Member 3 Phone': ''
      }];
      const ws = xlsx.utils.json_to_sheet(templateData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Template");
      xlsx.writeFile(wb, "AI_SparkX_Team_Template.xlsx");
    });
  };

  const exportTeams = () => {
    import('xlsx').then(xlsx => {
      const data = teams.map(t => ({
        'Team Name': t.team_name,
        'Login ID (AI ID)': t.ai_id,
        'Password': t.password,
        'Status': t.status,
        'Progress %': t.jigsaw_progress,
        'Score': t.score,
        'Round 1 Attempts': t.round1_attempts,
        'Disqualified': t.disqualified ? 'YES' : 'NO',
        'Qualified Round 2': t.qualifiedForRound2 ? 'YES' : 'NO',
        'Registration Number': t.officialTeamId
      }));
      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Teams Data");
      xlsx.writeFile(wb, "AI_SparkX_Teams_Export.xlsx");
    });
  };

  const purgeData = async () => {
    if(!window.confirm('WARNING: Delete ALL teams from the database?')) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/purge`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTeams();
      }
    } catch (err) {
      alert('Purge failed');
    }
  };

  const factoryReset = async () => {
    if(!window.confirm('WARNING: Are you sure you want to FACTORY RESET? This clears all progress, stops all rounds, and prepares the system for the real exam. Uploaded teams will NOT be deleted.')) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/system/factory-reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTeams();
        fetchState();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('Factory Reset failed');
    }
  };

  const toggleRoundState = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/state/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !isRoundActive })
      });
      const data = await res.json();
      if (data.success) setIsRoundActive(data.active);
    } catch (err) {
      alert('Failed to toggle round 1 state');
    }
  };
  
  const toggleRound2State = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/state/round2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !isRound2Active, timerMinutes: round2TimerInput })
      });
      const data = await res.json();
      if (data.success) setIsRound2Active(data.state.round2_active);
    } catch (err) {
      alert('Failed to toggle round 2 state');
    }
  };

  const toggleResultsAnnounced = async () => {
    if(!window.confirm(`Are you sure you want to ${isResultsAnnounced ? 'HIDE' : 'ANNOUNCE'} Round 1 Results to all teams in the Waiting Room?`)) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/state/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announced: !isResultsAnnounced })
      });
      const data = await res.json();
      if (data.success) setIsResultsAnnounced(data.state.results_announced);
    } catch (err) {
      alert('Failed to toggle results state');
    }
  };

  const resetTeam = async (teamId) => {
    if(!window.confirm(`Are you sure you want to restart this Team? This grants another attempt.`)) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/reset/${teamId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchTeams();
      }
    } catch (err) {
      alert('Failed to reset team');
    }
  };
  
  const disqualifyTeam = async (teamId) => {
    if(!window.confirm(`Are you sure you want to toggle disqualification?`)) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/${teamId}/disqualify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) fetchTeams();
    } catch (err) {
      alert('Failed to toggle DQ');
    }
  };

  const applyCutoff = async () => {
    if(!window.confirm(`Qualify top ${cutoff} teams for Round 2?`)) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/cutoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cutoff: parseInt(cutoff) })
      });
      const data = await res.json();
      if(data.success) fetchTeams();
    } catch (err) {
      alert('Cutoff failed');
    }
  };

  const toggleRound2Promotion = async (teamId) => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/promote/${teamId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTeams(prev => prev.map(t => t._id === teamId ? { ...t, qualifiedForRound2: data.qualifiedForRound2 } : t));
      }
    } catch (err) {
      alert('Failed to toggle promotion');
    }
  };

  const exportExcel = () => {
    window.location.href = `${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/export`;
  };
  
  const saveTeamEdit = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/${editingTeam._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTeam)
      });
      const data = await res.json();
      if(data.success) {
        setEditingTeam(null);
        fetchTeams();
      }
    } catch (e) {
      alert('Edit failed');
    }
  };

  const saveNewTeam = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeamData)
      });
      const data = await res.json();
      if(data.success) {
        setAddingTeam(false);
        setNewTeamData({ 
          team_name: '', ai_id: '', password: '', officialTeamId: '', eventName: '', 
          members: [{ fullName: '', role: '', agenticAiRegId: '', universityRegNo: '', yearOfStudy: '', dob: '', phone: '', email: '' }] 
        });
        fetchTeams();
      }
    } catch (e) {
      alert('Failed to add team');
    }
  };

  const filteredTeams = teams.filter(t => 
    t.team_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.ai_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.officialTeamId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.members?.some(m => m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-dashboard-container">
      {/* Top Navbar */}
      <nav className="admin-topbar">
        <h1 className="font-display">Ai SparkX Admin</h1>
        <div className="admin-tabs" style={{ display: 'flex', gap: '1rem', flex: 1, justifyContent: 'center' }}>
          <button 
            style={{ padding: '0.5rem 2rem', borderRadius: '8px', background: activeTab === 'leaderboard' ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: activeTab === 'leaderboard' ? '#fff' : '#94a3b8', cursor: 'pointer' }}
            onClick={() => setActiveTab('leaderboard')}
          >
            Leaderboard
          </button>
          <button 
            style={{ padding: '0.5rem 2rem', borderRadius: '8px', background: activeTab === 'alerts' ? 'rgba(239, 68, 68, 0.2)' : 'transparent', border: '1px solid rgba(239, 68, 68, 0.4)', color: activeTab === 'alerts' ? '#ef4444' : '#94a3b8', cursor: 'pointer', position: 'relative' }}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts 
            {alerts.length > 0 && <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>{alerts.length}</span>}
          </button>
        </div>
        <div className="round-status-badges">
          <div className="status-badge">
            <span className={`status-dot ${isRoundActive ? 'active' : ''}`}></span>
            Round 1 {isRoundActive ? 'ACTIVE' : 'LOCKED'}
          </div>
          <div className="status-badge">
            <span className={`status-dot ${isRound2Active ? 'active' : ''}`}></span>
            Round 2 {isRound2Active ? 'ACTIVE' : 'LOCKED'}
          </div>
          <div className="status-badge" style={{ background: isResultsAnnounced ? 'rgba(74, 222, 128, 0.1)' : 'rgba(148, 163, 184, 0.1)' }}>
            <span className={`status-dot ${isResultsAnnounced ? 'active' : ''}`} style={{ background: isResultsAnnounced ? '#4ade80' : '#94a3b8', boxShadow: isResultsAnnounced ? '0 0 10px #4ade80' : 'none' }}></span>
            Results {isResultsAnnounced ? 'LIVE' : 'HIDDEN'}
          </div>
        </div>
      </nav>

      {/* Main Layout Grid */}
      <div className="admin-layout">
        
        {/* Sidebar Controls */}
        <aside className="admin-sidebar">
          
          <div className="sidebar-section">
            <h3>Database Management</h3>
            
            <style>{`
              @keyframes fakeProgress {
                0% { width: 0%; }
                20% { width: 40%; }
                80% { width: 80%; }
                100% { width: 95%; }
              }
            `}</style>
            <input type="file" accept=".xlsx, .xls, .csv" style={{display: 'none'}} id="upload-excel" onChange={(e) => setFile(e.target.files[0])} />
            <button onClick={() => document.getElementById('upload-excel').click()} className="sidebar-btn btn-accent" disabled={isUploading} style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-file-excel'}`}></i>
                {isUploading ? 'Processing...' : 'Import Excel'}
              </div>
              {isUploading && (
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: 'rgba(255,255,255,0.2)', animation: 'fakeProgress 3s forwards' }}></div>
              )}
            </button>
            <button onClick={downloadTemplate} className="sidebar-btn" style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', marginTop: '0.5rem'}}>
              <i className="fa-solid fa-download"></i>
              Download Template
            </button>
            
            <button onClick={syncGoogleSheet} className="sidebar-btn btn-accent" disabled={isUploading} style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', marginTop: '0.5rem'}}>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className={`fa-brands ${isUploading ? 'fa-spinner fa-spin' : 'fa-google'}`}></i>
                {isUploading ? 'Syncing...' : 'Sync Google Form'}
              </div>
            </button>
            
            <button onClick={seedData} className="sidebar-btn">
              <i className="fa-solid fa-database"></i>
              Seed DB
            </button>
            
            <button onClick={() => navigate('/admin/add-team')} className="sidebar-btn btn-accent">
              <i className="fa-solid fa-user-plus"></i>
              Add Team
            </button>
            
            <button onClick={exportTeams} className="sidebar-btn btn-accent" style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)'}}>
              <i className="fa-solid fa-file-export"></i>
              Export Teams Data
            </button>
            
            <button onClick={factoryReset} className="sidebar-btn" style={{background: 'rgba(234, 179, 8, 0.2)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.5)'}}>
              <i className="fa-solid fa-power-off"></i>
              Factory Reset Progress
            </button>
            
            <button onClick={purgeData} className="sidebar-btn btn-danger-link">
              <i className="fa-solid fa-trash-can"></i>
              Purge All Data
            </button>
          </div>

          <div className="sidebar-section">
            <h3>Round 1 Control</h3>
            <button onClick={toggleRoundState} className={`sidebar-btn ${isRoundActive ? 'btn-danger-link' : 'btn-accent'}`}>
              <i className={`fa-solid ${isRoundActive ? 'fa-lock' : 'fa-rocket'}`}></i>
              {isRoundActive ? 'Lock Round 1' : 'Start Round 1'}
            </button>
            <button onClick={toggleResultsAnnounced} className={`sidebar-btn ${isResultsAnnounced ? 'btn-danger-link' : 'btn-accent'}`} style={{ marginTop: '0.5rem', background: isResultsAnnounced ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)', color: isResultsAnnounced ? '#ef4444' : '#4ade80', border: isResultsAnnounced ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(74,222,128,0.3)' }}>
              <i className={`fa-solid ${isResultsAnnounced ? 'fa-eye-slash' : 'fa-bullhorn'}`}></i>
              {isResultsAnnounced ? 'Hide R1 Results' : 'Announce R1 Results'}
            </button>
          </div>

          <div className="sidebar-section">
            <h3>Round 2 Control</h3>
            
            <div className="round-input-group">
              <input type="number" value={cutoff} onChange={e=>setCutoff(e.target.value)} title="Qualify Top N Teams" />
              <button onClick={applyCutoff}>Qualify Top</button>
            </div>
            
            <div className="round-input-group">
              <input type="number" value={round2TimerInput} onChange={e=>setRound2TimerInput(e.target.value)} title="Timer (Mins)" />
              <button onClick={toggleRound2State} style={isRound2Active ? {background: 'rgba(239, 68, 68, 0.2)', color: '#f87171'} : {}}>
                {isRound2Active ? 'Stop R2' : 'Start R2'}
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Data Export</h3>
            <button onClick={exportExcel} className="sidebar-btn">
              <i className="fa-solid fa-download"></i>
              Export Results
            </button>
            <button onClick={() => window.location.href = `${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/export-eval`} className="sidebar-btn">
              <i className="fa-solid fa-file-csv"></i>
              Export Eval Sheet
            </button>
            <button onClick={() => window.location.href = `${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/export-credentials`} className="sidebar-btn" style={{background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)'}}>
              <i className="fa-solid fa-key"></i>
              Export Credentials
            </button>
            <button onClick={() => window.location.href = `${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/export-qualified`} className="sidebar-btn" style={{background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.5)'}}>
              <i className="fa-solid fa-users"></i>
              Export Qualified List
            </button>
            <button onClick={() => window.open(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams/export-ps`, '_blank')} className="sidebar-btn" style={{background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.5)'}}>
              <i className="fa-solid fa-print"></i>
              Download PS Allocation
            </button>
          </div>

          <div className="sidebar-section">
            <h3>System</h3>
            <button onClick={handleLogout} className="sidebar-btn" style={{background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)'}}>
              <i className="fa-solid fa-right-from-bracket"></i>
              Logout Admin
            </button>
          </div>

        </aside>

        {/* Main Content Area */}
        <main className="admin-main">
          
          {activeTab === 'leaderboard' ? (
            <div className="glass-card">
              
              <div className="glass-card-header">
                <div>
                  <h2 className="font-display">Global Leaderboard</h2>
                  <p>Live monitoring of all teams</p>
                </div>
                <div className="search-bar">
                  <input 
                    type="text" 
                    className="search-input" 
                    placeholder="Search teams, IDs, or members..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <button className="btn-primary" onClick={fetchTeams}>
                    <i className="fa-solid fa-rotate-right"></i> Refresh
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th style={{width: '25%'}}>Team Name</th>
                      <th style={{width: '15%'}}>AI Credentials</th>
                      <th style={{width: '15%'}}>Status</th>
                      <th style={{width: '20%'}}>Progress</th>
                      <th style={{width: '10%'}}>Score</th>
                      <th style={{width: '15%', textAlign: 'center'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeams.length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign: 'center', padding: '3rem', color: '#94a3b8'}}>No teams match your search criteria.</td></tr>
                    ) : (
                      filteredTeams.map(team => {
                        const isDQ = team.disqualified;
                        const isCompleted = team.status === 'completed';
                        let statusClass = 'status-ready';
                        let statusText = team.status || 'READY';
                        if(isDQ) { statusClass = 'status-dq'; statusText = 'DISQUALIFIED'; }
                        else if(isCompleted) { statusClass = 'status-completed'; }
                        else if(statusText === 'computing') { statusClass = 'status-computing'; }

                        return (
                          <tr key={team._id} className={`table-row ${isDQ ? 'row-dq' : ''}`}>
                            <td>
                              <div className="team-info">
                                <div className="team-avatar">
                                  {team.team_name ? team.team_name[0].toUpperCase() : '?'}
                                </div>
                                <div className="team-details">
                                  <strong>{team.team_name}</strong>
                                  <span>{team.officialTeamId}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="ai-credentials font-mono">
                                <span>{team.ai_id}</span>
                                <span className="ai-pass">{team.password}</span>
                              </div>
                            </td>
                            <td>
                              <div className={`status-pill ${statusClass}`}>
                                <span className="dot"></span>
                                {statusText.toUpperCase()}
                              </div>
                            </td>
                            <td>
                              <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${team.jigsaw_progress || 0}%`, filter: isDQ ? 'grayscale(1)' : 'none' }}></div>
                              </div>
                              <span className="progress-text">{team.jigsaw_progress || 0}%</span>
                            </td>
                            <td>
                              <div className="score-display">
                                {team.score || 0}
                                <span>Attempts: {team.round1_attempts || 1}</span>
                              </div>
                            </td>
                            <td>
                              <div className="action-group">
                                <button 
                                  className={`btn-qualify ${team.qualifiedForRound2 ? 'promoted' : 'not-promoted'}`}
                                  onClick={() => toggleRound2Promotion(team._id)}
                                  disabled={isDQ}
                                  title={team.qualifiedForRound2 ? 'Revoke R2' : 'Qualify R2'}
                                >
                                  {team.qualifiedForRound2 ? 'R2 QUALIFIED' : 'R2 PROMOTE'}
                                </button>
                                <button className="btn-icon edit" title="Edit Team" onClick={() => setEditingTeam(team)}>
                                  <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button className="btn-icon restart" title="Restart Attempt" onClick={() => resetTeam(team._id)}>
                                  <i className="fa-solid fa-rotate-left"></i>
                                </button>
                                <button className="btn-icon dq" title={isDQ ? 'Undo Disqualify' : 'Disqualify'} onClick={() => disqualifyTeam(team._id)}>
                                  <i className="fa-solid fa-ban"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          ) : (
            <div className="glass-card">
               <div className="glass-card-header">
                 <div>
                   <h2 className="font-display">Active Alerts</h2>
                   <p>Real-time issues raised by teams</p>
                 </div>
               </div>
               <div className="alerts-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
                 {alerts.length === 0 ? (
                   <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', fontSize: '1.2rem' }}>No active alerts. Teams are doing great!</div>
                 ) : (
                   alerts.map(a => (
                     <div key={a.id} className="alert-item" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <h3 style={{ margin: '0 0 0.5rem 0', color: '#ef4444', fontSize: '1.25rem' }}>
                           {a.teamName} (Team No: {a.officialTeamId || a.teamId}) raised an issue!
                         </h3>
                         <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Raised at: {new Date(a.timestamp).toLocaleTimeString()}</span>
                       </div>
                       <button className="btn-primary" style={{ background: '#ef4444', border: 'none', color: '#fff' }} onClick={() => resolveAlert(a.id)}>Mark Resolved</button>
                     </div>
                   ))
                 )}
               </div>
            </div>
          )}

        </main>
      </div>

      {/* Editing Modal */}
      {editingTeam && (
        <div className="modal-overlay" onClick={() => setEditingTeam(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit Team: {editingTeam.team_name}</h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Team Name</label>
                <input value={editingTeam.team_name || ''} onChange={e => setEditingTeam({...editingTeam, team_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Official Team ID</label>
                <input value={editingTeam.officialTeamId || ''} onChange={e => setEditingTeam({...editingTeam, officialTeamId: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Login ID (AI Code)</label>
                <input value={editingTeam.ai_id || ''} onChange={e => setEditingTeam({...editingTeam, ai_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input value={editingTeam.password || ''} onChange={e => setEditingTeam({...editingTeam, password: e.target.value})} />
              </div>
            </div>
            
            <h3>Team Members</h3>
            {(editingTeam.members || []).map((m, i) => (
              <div key={i} className="member-card">
                <div className="member-card-header">
                  <h5>Member {i + 1}</h5>
                  <button className="btn-remove" onClick={() => {
                    const newMembers = [...editingTeam.members]; newMembers.splice(i, 1); setEditingTeam({...editingTeam, members: newMembers});
                  }}>Remove</button>
                </div>
                <div className="form-grid" style={{marginBottom: 0}}>
                  <div className="form-group"><input placeholder="Full Name" value={m.fullName || ''} onChange={e => { const newMembers = [...editingTeam.members]; newMembers[i].fullName = e.target.value; setEditingTeam({...editingTeam, members: newMembers}); }} /></div>
                  <div className="form-group"><input placeholder="AI ID" value={m.agenticAiRegId || ''} onChange={e => { const newMembers = [...editingTeam.members]; newMembers[i].agenticAiRegId = e.target.value; setEditingTeam({...editingTeam, members: newMembers}); }} /></div>
                  <div className="form-group"><input placeholder="University Reg No" value={m.universityRegNo || ''} onChange={e => { const newMembers = [...editingTeam.members]; newMembers[i].universityRegNo = e.target.value; setEditingTeam({...editingTeam, members: newMembers}); }} /></div>
                  <div className="form-group"><input placeholder="Email" value={m.email || ''} onChange={e => { const newMembers = [...editingTeam.members]; newMembers[i].email = e.target.value; setEditingTeam({...editingTeam, members: newMembers}); }} /></div>
                  <div className="form-group"><input placeholder="Phone" value={m.phone || ''} onChange={e => { const newMembers = [...editingTeam.members]; newMembers[i].phone = e.target.value; setEditingTeam({...editingTeam, members: newMembers}); }} /></div>
                </div>
              </div>
            ))}
            {(editingTeam.members || []).length < 3 && (
              <button type="button" className="btn-secondary" onClick={() => {
                setEditingTeam({...editingTeam, members: [...(editingTeam.members || []), { fullName: '', agenticAiRegId: '', universityRegNo: '', yearOfStudy: '', dob: '', phone: '', email: '' }]});
              }}>+ Add Member</button>
            )}

            <div className="modal-actions">
               <button type="button" className="btn-secondary" onClick={() => setEditingTeam(null)}>Cancel</button>
               <button type="button" className="btn-primary" onClick={saveTeamEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Adding Modal Removed (moved to separate page) */}
    </div>
  );
};

export default AdminDashboard;
