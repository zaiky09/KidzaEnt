import { useState } from 'react';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setMessage('✅ Reset link sent! Please check your email inbox.');
    } catch (err) {
      setMessage('❌ Email not found.');
    }
  };

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Reset Password</h2>
        <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.9rem', marginBottom: '20px' }}>Enter your email and we'll send you a link to reset your password.</p>
        <form onSubmit={handleReset}>
          <input type="email" placeholder="Enter your email" className="input-modern" style={{ width: '100%', marginBottom: '20px' }} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>Send Reset Link</button>
        </form>
        {message && <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.85rem' }}>{message}</p>}
      </div>
    </div>
  );
};

export default ForgotPassword;

