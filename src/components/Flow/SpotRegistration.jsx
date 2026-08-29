import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css'; // Re-use Stitch styles

const SpotRegistration = () => {
  const navigate = useNavigate();
  
  const [teamName, setTeamName] = useState('');
  
  // Member States
  const [members, setMembers] = useState([
    { fullName: '', agenticAiRegId: '', universityRegNo: '', email: '', phone: '' }
  ]);
  
  const [showMember2, setShowMember2] = useState(false);
  const [showMember3, setShowMember3] = useState(false);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleMemberChange = (index, field, value) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const addMember = () => {
    if (members.length < 3) {
      setMembers([...members, { fullName: '', agenticAiRegId: '', universityRegNo: '', email: '', phone: '' }]);
    }
  };

  const removeMember = (index) => {
    const updated = [...members];
    updated.splice(index, 1);
    setMembers(updated);
    if (index === 2) setShowMember3(false);
    if (index === 1) {
      if (showMember3) {
        setShowMember3(false); // shifted up
      } else {
        setShowMember2(false);
      }
    }
  };

  const validateForm = () => {
    if (!teamName.trim()) return "Team Name is required.";
    
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.fullName.trim() || !m.agenticAiRegId.trim() || !m.universityRegNo.trim() || !m.email.trim() || !m.phone.trim()) {
        return `All fields are required for Member ${i + 1}.`;
      }
      
      if (!m.universityRegNo.trim() || m.universityRegNo.trim().length !== 10) {
        return `University Reg No must be exactly 10 characters for Member ${i + 1}.`;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(m.email.trim())) {
        return `Invalid email format for Member ${i + 1}.`;
      }
      
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(m.phone.trim())) {
        return `Phone number must be 10 digits for Member ${i + 1}.`;
      }
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setShowConfirmation(true);
  };

  const executeRegistration = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${import.meta.env.PROD ? 'https://vucse.app/sparkx' : 'http://localhost:6012'}/api/spot-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: teamName.trim(),
          members: members.map(m => ({
            fullName: m.fullName.trim(),
            agenticAiRegId: m.agenticAiRegId.trim(),
            universityRegNo: m.universityRegNo.trim(),
            email: m.email.trim(),
            phone: m.phone.trim()
          }))
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccessData(data);
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Registration could not be completed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMemberForm = (index) => {
    const m = members[index];
    if (!m) return null;
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem', position: 'relative' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--violet)', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between' }}>
          MEMBER {index + 1} {index === 0 && <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>* REQUIRED</span>}
          {index > 0 && (
            <button type="button" onClick={() => removeMember(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}>
              Remove
            </button>
          )}
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Full Name *</label>
            <input type="text" value={m.fullName} onChange={e => handleMemberChange(index, 'fullName', e.target.value)} placeholder="Full name" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>AI SparkX ID *</label>
            <input type="text" value={m.agenticAiRegId} onChange={e => handleMemberChange(index, 'agenticAiRegId', e.target.value)} placeholder="VUCSE0XXXX" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>University Registration No. *</label>
            <input type="text" value={m.universityRegNo} onChange={e => handleMemberChange(index, 'universityRegNo', e.target.value.toUpperCase())} placeholder="231FAXXXXX" maxLength={10} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email *</label>
            <input type="email" value={m.email} onChange={e => handleMemberChange(index, 'email', e.target.value)} placeholder="regno@gmail.com" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box' }} required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Phone Number *</label>
            <input type="tel" value={m.phone} onChange={e => handleMemberChange(index, 'phone', e.target.value.replace(/\D/g, ''))} placeholder="XXXXXXXXXX" maxLength={10} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', boxSizing: 'border-box' }} required />
          </div>
        </div>
      </div>
    );
  };

  if (successData) {
    return (
      <div className="stitch-layout" style={{ minHeight: '100vh', height: 'auto', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="stitch-bg"></div>
        <div style={{ background: 'rgba(15,23,42,0.8)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(34,197,94,0.5)', maxWidth: '500px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 10, backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h1 style={{ color: '#22c55e', margin: '0 0 1rem 0', fontFamily: 'Space Grotesk' }}>Registration Successful!</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Your team has been successfully registered for AI SparkX.</p>
          
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registration ID</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>{successData.registrationId}</div>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Login ID</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#a855f7', fontFamily: 'monospace' }}>{successData.loginId}</div>
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Team Name</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{successData.teamName}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Number of Members</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>{successData.memberCount}</div>
            </div>
          </div>
          
          <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)', marginBottom: '2rem', fontSize: '0.9rem', color: '#d8b4fe' }}>
            <strong>Important:</strong> Your team's password has been set to <strong>Member 1's Phone Number</strong>. Please use this to login to the system.
          </div>

          <button onClick={() => window.location.href = '/'} className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>Done</button>
          <button onClick={() => window.location.reload()} className="btn-secondary" style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>Register Another Team</button>
        </div>
      </div>
    );
  }

  return (
    <div className="stitch-layout" style={{ minHeight: '100vh', height: 'auto', overflowY: 'auto', padding: '2rem 1rem' }}>
      <div className="stitch-bg"></div>

      {showConfirmation && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: 'rgba(15,23,42,0.95)', padding: '2.5rem', borderRadius: '20px', border: '1px solid rgba(168, 85, 247, 0.5)', maxWidth: '400px', width: '90%', textAlign: 'center', color: '#fff', boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ marginTop: 0, color: 'var(--orange)', fontSize: '1.5rem', fontFamily: 'Space Grotesk' }}>Confirm Details</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>Are you sure you want to submit? Please ensure all details are correct as they cannot be changed later.</p>
            
            <div style={{ background: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', textAlign: 'left', fontSize: '0.95rem' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Team Name</span>
                <strong>{teamName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Members</span>
                <strong>{members.length} {members.length === 1 ? 'Member' : 'Members'}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setShowConfirmation(false)} className="btn-secondary" style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>Cancel</button>
              <button onClick={executeRegistration} className="btn-primary" style={{ flex: 1 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: '#fff' }}>AI SparkX</h1>
          <h2 style={{ fontFamily: 'Space Grotesk', fontSize: '1.5rem', margin: '0 0 1rem 0', color: 'var(--orange)' }}>Spot Registration</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.5 }}>Register your team quickly by entering the required details below. Please verify all information before submitting.</p>
        </header>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Team Details Section */}
          <div style={{ background: 'rgba(15,23,42,0.6)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff', fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Team Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Team Name *</label>
                <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Neural Ninjas" style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: '1.1rem', boxSizing: 'border-box' }} required />
              </div>
            </div>
          </div>

          {/* Member Details Section */}
          <div style={{ background: 'rgba(15,23,42,0.6)', padding: '2rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff', fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Team Member Details</h2>
            
            {members.map((_, i) => renderMemberForm(i))}

            {members.length < 3 && (
              <button type="button" onClick={addMember} style={{ background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)', color: '#fff', padding: '1rem', borderRadius: '8px', cursor: 'pointer', marginTop: '1rem', transition: 'background 0.3s' }}>
                + Add Member {members.length + 1}
              </button>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? 'Submitting...' : 'Submit Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SpotRegistration;
