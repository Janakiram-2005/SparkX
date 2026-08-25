import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [teams, setTeams] = useState([]);
  const [file, setFile] = useState(null);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const [isRound2Active, setIsRound2Active] = useState(false);
  const [round2TimerInput, setRound2TimerInput] = useState(45);
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cutoff, setCutoff] = useState(20);
  
  const [editingTeam, setEditingTeam] = useState(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ 
    team_name: '', ai_id: '', password: '', officialTeamId: '', eventName: '', 
    members: [{ fullName: '', role: '', agenticAiRegId: '', universityRegNo: '', yearOfStudy: '', dob: '', phone: '', email: '' }] 
  });

  useEffect(() => {
    const newSocket = io(import.meta.env.PROD ? undefined : 'http://localhost:5000');
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

    newSocket.on('state_changed', ({ round1_active }) => {
      setIsRoundActive(round1_active);
    });
    
    newSocket.on('round2_state_update', ({ active, endTime }) => {
      setIsRound2Active(active);
    });

    newSocket.on('team_update', (updatedTeam) => {
      setTeams(prev => prev.map(t => t._id === updatedTeam._id ? updatedTeam : t));
    });

    fetchState();
    fetchTeams();

    return () => newSocket.disconnect();
  }, []);

  const fetchTeams = async () => {
    const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams`);
    const data = await res.json();
    if (data.success) setTeams(data.teams);
  };

  const fetchState = async () => {
    const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/state`);
    const data = await res.json();
    if (data.success && data.state) {
      setIsRoundActive(Boolean(data.state.round1_active));
      setIsRound2Active(Boolean(data.state.round2_active));
    }
  };

  const handleFileUpload = async () => {
    if (!file) return alert('Please select an Excel file');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/upload`, {
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
      alert('Upload failed');
    }
  };

  const seedData = async () => {
    if(!window.confirm("Seed database with temporary teams?")) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/seed`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTeams();
      }
    } catch (err) {
      alert("Seeding failed");
    }
  };

  const purgeData = async () => {
    if(!window.confirm("WARNING: Delete ALL teams from the database?")) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/purge`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchTeams();
      }
    } catch (err) {
      alert("Purge failed");
    }
  };

  const toggleRoundState = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/state/toggle`, {
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
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/state/round2`, {
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

  const resetTeam = async (teamId) => {
    if(!window.confirm(`Are you sure you want to restart this Team? This grants another attempt.`)) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/reset/${teamId}`, { method: 'POST' });
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
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/${teamId}/disqualify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) fetchTeams();
    } catch (err) {
      alert('Failed to toggle DQ');
    }
  };

  const applyCutoff = async () => {
    if(!window.confirm(`Qualify top ${cutoff} teams for Round 2?`)) return;
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/cutoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cutoff: parseInt(cutoff) })
      });
      const data = await res.json();
      if(data.success) fetchTeams();
    } catch (err) {
      alert("Cutoff failed");
    }
  };

  const toggleRound2Promotion = async (teamId) => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/promote/${teamId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTeams(prev => prev.map(t => t._id === teamId ? { ...t, qualifiedForRound2: data.qualifiedForRound2 } : t));
      }
    } catch (err) {
      alert('Failed to toggle promotion');
    }
  };

  const exportExcel = () => {
    window.location.href = `${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/export`;
  };
  
  const saveTeamEdit = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/${editingTeam._id}`, {
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
      alert("Edit failed");
    }
  };

  const saveNewTeam = async () => {
    try {
      const res = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:5000'}/api/admin/teams/add`, {
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
      alert("Failed to add team");
    }
  };

  const filteredTeams = teams.filter(t => 
    t.team_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.ai_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.officialTeamId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.members?.some(m => m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h1>Admin Control Panel</h1>
        <div style={{display: 'flex', gap: '2rem'}}>
          <div className="admin-status">
            <span className={`status-indicator ${isRoundActive ? 'active' : 'waiting'}`}></span>
            R1 {isRoundActive ? 'LIVE' : 'LOCKED'}
          </div>
          <div className="admin-status">
            <span className={`status-indicator ${isRound2Active ? 'active' : 'waiting'}`}></span>
            R2 {isRound2Active ? 'LIVE' : 'LOCKED'}
          </div>
        </div>
      </header>

      <div className="admin-controls-grid">
        {/* DB Control Card */}
        <div className="admin-card">
          <h2>1. Database Controls</h2>
          <div className="upload-zone" style={{ marginBottom: '1rem' }}>
            <input type="file" accept=".xlsx, .xls" onChange={e => setFile(e.target.files[0])} />
            <button className="btn-primary" onClick={handleFileUpload}>Import Excel</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button className="btn-secondary" style={{flex: 1}} onClick={seedData}>Seed Mock Data</button>
            <button className="btn-danger" style={{flex: 1}} onClick={purgeData}>Purge All</button>
          </div>
          <button className="btn-primary" style={{ width: '100%', marginBottom: '0.5rem', background: '#3b82f6' }} onClick={() => setAddingTeam(true)}>+ Add Single Team</button>
          <button className="btn-primary" style={{ width: '100%', background: '#10b981' }} onClick={exportExcel}>Export Teams to Excel</button>
        </div>

        {/* Round 1 Card */}
        <div className="admin-card">
          <h2>2. Round 1 Controls</h2>
          <div className="master-actions">
            <button 
              className={`btn-giant ${isRoundActive ? 'btn-danger' : 'btn-success'}`}
              onClick={toggleRoundState}
            >
              {isRoundActive ? 'LOCK ROUND 1' : 'START ROUND 1'}
            </button>
          </div>
        </div>

        {/* Round 2 Card */}
        <div className="admin-card">
          <h2>3. Round 2 Setup</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
             <input type="number" className="admin-input" value={cutoff} onChange={e=>setCutoff(e.target.value)} style={{width: '60px'}} />
             <button className="btn-secondary" onClick={applyCutoff}>Auto-Qualify Top N</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <input type="number" className="admin-input" value={round2TimerInput} onChange={e=>setRound2TimerInput(e.target.value)} style={{width: '60px'}} title="Minutes" />
             <button className={`btn-primary ${isRound2Active ? 'btn-danger' : 'btn-success'}`} onClick={toggleRound2State}>
               {isRound2Active ? 'STOP R2' : 'LAUNCH R2'}
             </button>
          </div>
        </div>

        {/* Export Card */}
        <div className="admin-card">
          <h2>4. Data Export</h2>
          <button className="btn-secondary" onClick={exportExcel} style={{width: '100%'}}>Export Results to Excel</button>
        </div>
      </div>
      
      {editingTeam && (
        <div className="edit-modal-overlay">
          <div className="edit-modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Edit Team: {editingTeam.team_name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="edit-form-group">
                <label>Team Name</label>
                <input className="admin-input" value={editingTeam.team_name || ''} onChange={e => setEditingTeam({...editingTeam, team_name: e.target.value})} />
              </div>
              <div className="edit-form-group">
                <label>Official Team ID</label>
                <input className="admin-input" value={editingTeam.officialTeamId || ''} onChange={e => setEditingTeam({...editingTeam, officialTeamId: e.target.value})} />
              </div>
              <div className="edit-form-group">
                <label>Login ID</label>
                <input className="admin-input" value={editingTeam.ai_id || ''} onChange={e => setEditingTeam({...editingTeam, ai_id: e.target.value})} />
              </div>
              <div className="edit-form-group">
                <label>Password</label>
                <input className="admin-input" value={editingTeam.password || ''} onChange={e => setEditingTeam({...editingTeam, password: e.target.value})} />
              </div>
            </div>
            
            <h4>Team Members</h4>
            {(editingTeam.members || []).map((m, i) => (
              <div key={i} style={{ border: '1px solid #334155', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
                <h5>Member {i + 1}</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input className="admin-input" placeholder="Full Name" value={m.fullName || ''} onChange={e => {
                    const newMembers = [...editingTeam.members]; newMembers[i].fullName = e.target.value; setEditingTeam({...editingTeam, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="Role (e.g. Leader)" value={m.role || ''} onChange={e => {
                    const newMembers = [...editingTeam.members]; newMembers[i].role = e.target.value; setEditingTeam({...editingTeam, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="University Reg No" value={m.universityRegNo || ''} onChange={e => {
                    const newMembers = [...editingTeam.members]; newMembers[i].universityRegNo = e.target.value; setEditingTeam({...editingTeam, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="Email" value={m.email || ''} onChange={e => {
                    const newMembers = [...editingTeam.members]; newMembers[i].email = e.target.value; setEditingTeam({...editingTeam, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="Phone" value={m.phone || ''} onChange={e => {
                    const newMembers = [...editingTeam.members]; newMembers[i].phone = e.target.value; setEditingTeam({...editingTeam, members: newMembers});
                  }} />
                </div>
              </div>
            ))}
            {(editingTeam.members || []).length < 3 && (
              <button className="btn-secondary btn-sm" onClick={() => {
                setEditingTeam({...editingTeam, members: [...(editingTeam.members || []), { fullName: '', role: '', agenticAiRegId: '', universityRegNo: '', yearOfStudy: '', dob: '', phone: '', email: '' }]});
              }}>+ Add Member</button>
            )}

            <div className="edit-actions" style={{ marginTop: '2rem' }}>
               <button className="btn-secondary" onClick={() => setEditingTeam(null)}>Cancel</button>
               <button className="btn-primary" onClick={saveTeamEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Adding Modal */}
      {addingTeam && (
        <div className="edit-modal-overlay">
          <div className="edit-modal" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>Add New Team</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="edit-form-group">
                <label>Team Name</label>
                <input type="text" className="admin-input" value={newTeamData.team_name} onChange={e => setNewTeamData({...newTeamData, team_name: e.target.value})} />
              </div>
              <div className="edit-form-group">
                <label>Official Team ID</label>
                <input type="text" className="admin-input" value={newTeamData.officialTeamId} onChange={e => setNewTeamData({...newTeamData, officialTeamId: e.target.value})} />
              </div>
              <div className="edit-form-group">
                <label>Login ID</label>
                <input type="text" className="admin-input" value={newTeamData.ai_id} onChange={e => setNewTeamData({...newTeamData, ai_id: e.target.value})} />
              </div>
              <div className="edit-form-group">
                <label>Password</label>
                <input type="text" className="admin-input" value={newTeamData.password} onChange={e => setNewTeamData({...newTeamData, password: e.target.value})} />
              </div>
            </div>

            <h4>Team Members</h4>
            {(newTeamData.members || []).map((m, i) => (
              <div key={i} style={{ border: '1px solid #334155', padding: '1rem', marginBottom: '1rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h5>Member {i + 1}</h5>
                  <button className="btn-danger-sm" onClick={() => {
                    const newMembers = [...newTeamData.members]; newMembers.splice(i, 1); setNewTeamData({...newTeamData, members: newMembers});
                  }}>Remove</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input className="admin-input" placeholder="Full Name" value={m.fullName || ''} onChange={e => {
                    const newMembers = [...newTeamData.members]; newMembers[i].fullName = e.target.value; setNewTeamData({...newTeamData, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="Role (e.g. Leader)" value={m.role || ''} onChange={e => {
                    const newMembers = [...newTeamData.members]; newMembers[i].role = e.target.value; setNewTeamData({...newTeamData, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="University Reg No" value={m.universityRegNo || ''} onChange={e => {
                    const newMembers = [...newTeamData.members]; newMembers[i].universityRegNo = e.target.value; setNewTeamData({...newTeamData, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="Email" value={m.email || ''} onChange={e => {
                    const newMembers = [...newTeamData.members]; newMembers[i].email = e.target.value; setNewTeamData({...newTeamData, members: newMembers});
                  }} />
                  <input className="admin-input" placeholder="Phone" value={m.phone || ''} onChange={e => {
                    const newMembers = [...newTeamData.members]; newMembers[i].phone = e.target.value; setNewTeamData({...newTeamData, members: newMembers});
                  }} />
                </div>
              </div>
            ))}
            {(newTeamData.members || []).length < 3 && (
              <button className="btn-secondary btn-sm" onClick={() => {
                setNewTeamData({...newTeamData, members: [...(newTeamData.members || []), { fullName: '', role: '', agenticAiRegId: '', universityRegNo: '', yearOfStudy: '', dob: '', phone: '', email: '' }]});
              }}>+ Add Member</button>
            )}

            <div className="edit-actions" style={{ marginTop: '2rem' }}>
              <button className="btn-secondary" onClick={() => setAddingTeam(false)}>Cancel</button>
              <button className="btn-success" onClick={saveNewTeam}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="leaderboard-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Live Team Monitoring</h2>
          <input 
            type="text" 
            placeholder="Search teams or members..." 
            className="admin-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>AI Code / Pass</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Score (Attempts)</th>
              <th>Round 2</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.length === 0 ? (
              <tr><td colSpan="7" className="text-center">No teams found.</td></tr>
            ) : (
              filteredTeams.map(team => (
                <tr key={team._id} className={team.disqualified ? 'row-dq' : (team.status === 'completed' ? 'row-completed' : '')}>
                  <td>
                    <strong>{team.team_name}</strong><br/>
                    <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>{team.officialTeamId}</span>
                  </td>
                  <td>
                    <span className="mono">{team.ai_id}</span><br/>
                    <span className="mono" style={{color: '#ef4444'}}>{team.password}</span>
                  </td>
                  <td><span className={`badge badge-${team.status}`}>{team.disqualified ? 'DISQUALIFIED' : team.status.toUpperCase()}</span></td>
                  <td>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${team.jigsaw_progress}%` }}></div>
                      <span className="progress-text">{team.jigsaw_progress}%</span>
                    </div>
                  </td>
                  <td>{team.score} pts <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>({team.round1_attempts || 1})</span></td>
                  <td>
                    <button 
                      className={`btn-sm ${team.qualifiedForRound2 ? 'btn-success' : 'btn-secondary'}`}
                      onClick={() => toggleRound2Promotion(team._id)}
                      disabled={team.disqualified}
                    >
                      {team.qualifiedForRound2 ? 'QUALIFIED' : 'PROMOTE'}
                    </button>
                  </td>
                  <td>
                    <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                      <button className="btn-secondary btn-sm" onClick={() => setEditingTeam(team)}>Edit</button>
                      <button className="btn-danger-sm" onClick={() => resetTeam(team._id)}>Restart</button>
                      <button className="btn-danger-sm" style={{borderColor: '#f59e0b', color: '#f59e0b'}} onClick={() => disqualifyTeam(team._id)}>
                        {team.disqualified ? 'Undo DQ' : 'DQ'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
