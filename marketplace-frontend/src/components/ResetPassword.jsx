import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('❌ Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setMessage('❌ Password must be at least 8 characters long.');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`http://localhost:5000/api/auth/reset-password/${token}`, { password });
      setMessage('✅ Password updated! Redirecting to login...');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || '❌ Link expired or invalid.';
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Set New Password</h2>
        <form onSubmit={handleUpdate}>
          <input 
            type="password" 
            placeholder="New Password" 
            className="input-modern" 
            style={{ width: '100%', marginBottom: '20px' }} 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Confirm New Password" 
            className="input-modern" 
            style={{ width: '100%', marginBottom: '20px' }} 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
          />
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%' }} 
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        {message && <p style={{ marginTop: '20px', textAlign: 'center' }}>{message}</p>}
      </div>
    </div>
  );
};

export default ResetPassword;


