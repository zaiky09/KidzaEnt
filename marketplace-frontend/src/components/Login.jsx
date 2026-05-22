import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isDriverSignup, setIsDriverSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // --- NEW: INPUT VALIDATION ---
  const validateInputs = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(?:254|\+254|0)?(7|1)\d{8}$/; // Kenyan Standard

    if (!emailRegex.test(email)) {
      setMessage('❌ Please enter a valid email address.');
      return false;
    }
    if (!isLogin && !phoneRegex.test(phone)) {
      setMessage('❌ Enter a valid Kenyan phone (e.g. 0712345678).');
      return false;
    }
    if (password.length < 8) {
      setMessage('❌ Password must be at least 8 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!validateInputs()) return;

    try {
      if (isLogin) {
        const response = await api.post('/api/auth/login', { email, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('role', response.data.role);
        if (response.data.username) localStorage.setItem('username', response.data.username);

        if (response.data.role === 'admin') navigate('/admin');
        else if (response.data.role === 'driver') navigate('/driver');
        else navigate('/');
      } else {
        await api.post('/api/auth/signup', {
          username, email, password, phone,
          role: isDriverSignup ? 'driver' : 'customer'
        });
        setMessage('✨ Account created! You can now log in.');
        setIsLogin(true);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#F9FAFB' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#111827', marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : (isDriverSignup ? 'Join the Fleet' : 'Get Started')}
          </h2>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>{isLogin ? 'Log in to your account' : 'Create your account in seconds'}</p>
        </div>

        {message && (
          <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '0.9rem', backgroundColor: message.includes('✨') ? '#ECFDF5' : '#FEE2E2', color: message.includes('✨') ? '#059669' : '#DC2626', fontWeight: '600' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {!isLogin && (
            <>
              <input type="text" placeholder="Full Name" required className="input-modern" value={username} onChange={(e) => setUsername(e.target.value)} />
              <input type="tel" placeholder="Phone (e.g. 0712345678)" required className="input-modern" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          <input type="email" placeholder="Email Address" required className="input-modern" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" required className="input-modern" value={password} onChange={(e) => setPassword(e.target.value)} />

          {isLogin && (
            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: '#3B82F6', textDecoration: 'none' }}>Forgot Password?</Link>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', marginTop: '10px' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: '25px', textAlign: 'center', fontSize: '0.9rem' }}>
          <p style={{ color: '#6B7280', margin: '0 0 10px 0' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => { setIsLogin(!isLogin); setIsDriverSignup(false); setMessage(''); }} style={{ color: '#F5B041', cursor: 'pointer', fontWeight: '700' }}>{isLogin ? 'Sign up' : 'Log in'}</span>
          </p>
          {!isLogin && (
            <p onClick={() => setIsDriverSignup(!isDriverSignup)} style={{ color: '#3B82F6', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
              {isDriverSignup ? "← Back to Customer Signup" : "Become a Driver"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;


