import React, { useState } from 'react';

const FeedbackForm = ({ team }) => {
  const [rating, setRating] = useState(5);
  const [improvements, setImprovements] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Assuming a basic POST endpoint exists or will exist for feedbacks
      // But we haven't strictly created the feedback api yet, so we'll simulate for now.
      console.log('Feedback submitted:', { teamId: team.id, rating, improvements });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (submitted) {
    return (
      <div className="flow-container">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h2>Thank You!</h2>
          <p>Your feedback has been recorded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Post-Event Feedback</h2>
          <p>How was your experience, {team.team_name}?</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Rating (1-5)</label>
            <input 
              type="number" 
              min="1" max="5" 
              value={rating} 
              onChange={e => setRating(parseInt(e.target.value))} 
              required
            />
          </div>
          
          <div className="form-group">
            <label>Any improvements?</label>
            <textarea 
              rows="4" 
              value={improvements}
              onChange={e => setImprovements(e.target.value)}
              style={{ padding: '0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'Inter' }}
            />
          </div>
          
          <button type="submit" className="btn-primary-flow">Submit Feedback</button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
