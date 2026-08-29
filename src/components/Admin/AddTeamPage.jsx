import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AddTeamPage = () => {
  const navigate = useNavigate();
  const [newTeamData, setNewTeamData] = useState({ 
    team_name: '', ai_id: '', password: '', officialTeamId: '', eventName: '', 
    members: [{ fullName: '', agenticAiRegId: '', universityRegNo: '', yearOfStudy: '', dob: '', phone: '', email: '' }] 
  });

  useEffect(() => {
    const adminToken = sessionStorage.getItem('adminToken');
    if (!adminToken || Date.now() - parseInt(adminToken) > 3600000) {
      sessionStorage.removeItem('adminToken');
      navigate('/adminsparkx1');
    }
  }, [navigate]);

  const saveNewTeam = async () => {
    if (!newTeamData.team_name || !newTeamData.ai_id || !newTeamData.password) {
      alert('Team Name, Login ID, and Password are required.');
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:5000'}/api/admin/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeamData)
      });
      const data = await res.json();
      if (data.success) {
        alert('Team added successfully!');
        navigate('/admin/dashboard');
      } else {
        alert(data.message || 'Failed to add team');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving team');
    }
  };

  return (
    <div className="admin-layout" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '3rem 1rem', overflowY: 'auto' }}>
      <div className="modal-content" style={{ position: 'relative', maxHeight: 'none', overflowY: 'visible', margin: '0 auto' }}>
        <button className="btn-secondary" style={{ marginBottom: '2rem' }} onClick={() => navigate('/admin/dashboard')}>
          &larr; Back to Dashboard
        </button>
        
        <h3>Add New Team</h3>
        
        <div className="form-grid">
          <div className="form-group">
            <label>Team Name</label>
            <input value={newTeamData.team_name} onChange={e => setNewTeamData({...newTeamData, team_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Official Team ID</label>
            <input value={newTeamData.officialTeamId} onChange={e => setNewTeamData({...newTeamData, officialTeamId: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Login ID (AI Code)</label>
            <input value={newTeamData.ai_id} onChange={e => setNewTeamData({...newTeamData, ai_id: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input value={newTeamData.password} onChange={e => setNewTeamData({...newTeamData, password: e.target.value})} />
          </div>
        </div>

        <h3 style={{ marginTop: '2rem' }}>Team Members</h3>
        {(newTeamData.members || []).map((m, i) => (
          <div key={i} className="member-card">
            <div className="member-card-header">
              <h5>Member {i + 1}</h5>
              <button className="btn-remove" onClick={() => {
                const newMembers = [...newTeamData.members]; newMembers.splice(i, 1); setNewTeamData({...newTeamData, members: newMembers});
              }}>Remove</button>
            </div>
            <div className="form-grid" style={{marginBottom: 0}}>
              <div className="form-group"><input placeholder="Full Name" value={m.fullName || ''} onChange={e => { const newMembers = [...newTeamData.members]; newMembers[i].fullName = e.target.value; setNewTeamData({...newTeamData, members: newMembers}); }} /></div>
              <div className="form-group"><input placeholder="AI ID" value={m.agenticAiRegId || ''} onChange={e => { const newMembers = [...newTeamData.members]; newMembers[i].agenticAiRegId = e.target.value; setNewTeamData({...newTeamData, members: newMembers}); }} /></div>
              <div className="form-group"><input placeholder="University Reg No" value={m.universityRegNo || ''} onChange={e => { const newMembers = [...newTeamData.members]; newMembers[i].universityRegNo = e.target.value; setNewTeamData({...newTeamData, members: newMembers}); }} /></div>
              <div className="form-group"><input placeholder="Email" value={m.email || ''} onChange={e => { const newMembers = [...newTeamData.members]; newMembers[i].email = e.target.value; setNewTeamData({...newTeamData, members: newMembers}); }} /></div>
              <div className="form-group"><input placeholder="Phone" value={m.phone || ''} onChange={e => { const newMembers = [...newTeamData.members]; newMembers[i].phone = e.target.value; setNewTeamData({...newTeamData, members: newMembers}); }} /></div>
            </div>
          </div>
        ))}
        {(newTeamData.members || []).length < 3 && (
          <button type="button" className="btn-secondary" onClick={() => {
            setNewTeamData({...newTeamData, members: [...(newTeamData.members || []), { fullName: '', agenticAiRegId: '', universityRegNo: '', yearOfStudy: '', dob: '', phone: '', email: '' }]});
          }}>+ Add Member</button>
        )}

        <div className="modal-actions" style={{ marginTop: '3rem' }}>
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/dashboard')}>Cancel</button>
          <button type="button" className="btn-primary" onClick={saveNewTeam}>Save Team</button>
        </div>
      </div>
    </div>
  );
};

export default AddTeamPage;
