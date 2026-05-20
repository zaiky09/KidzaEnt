import { useState, useEffect } from 'react';
import axios from 'axios';

const DriverProfileForm = ({ onProfileSubmit }) => {
  const [formData, setFormData] = useState({
    nationalId: '', idPhoto: '', licenseNumber: '', licensePhoto: '',
    vehicleReg: '', vehicleType: 'Motorbike', vehicleColor: '', profilePhoto: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchExistingData = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.driverDetails) setFormData(res.data.driverDetails);
      } catch (err) { console.log("New user, no profile found."); }
    };
    fetchExistingData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.put('http://localhost:5000/api/users/complete-profile', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ Profile Submitted! Waiting for verification.');
      setTimeout(() => { if (onProfileSubmit) onProfileSubmit(); }, 2000);
    } catch {
      setMessage('❌ Submission failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '20px auto', padding: '30px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Driver Compliance Details</h3>
      {message && <div style={{ padding: '12px', background: '#F3F4F6', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontWeight: '700' }}>{message}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <input name="nationalId" placeholder="National ID" required className="input-modern" value={formData.nationalId} onChange={handleChange} />
        <input name="licenseNumber" placeholder="DL Number" required className="input-modern" value={formData.licenseNumber} onChange={handleChange} />
        <input name="vehicleReg" placeholder="Vehicle Reg (KCA 123X)" required className="input-modern" value={formData.vehicleReg} onChange={handleChange} />
        
        <select name="vehicleType" className="input-modern" value={formData.vehicleType} onChange={handleChange}>
          <option value="Motorbike">Motorbike</option>
          <option value="Tuk Tuk">Tuk Tuk</option>
          <option value="Car">Car</option>
        </select>

        <input name="vehicleColor" placeholder="Color" required className="input-modern" value={formData.vehicleColor} onChange={handleChange} />
        <input name="profilePhoto" placeholder="Profile Photo URL" className="input-modern" value={formData.profilePhoto} onChange={handleChange} />
        <input name="idPhoto" placeholder="ID Photo URL" className="input-modern" style={{ gridColumn: '1/-1' }} value={formData.idPhoto} onChange={handleChange} />
        <input name="licensePhoto" placeholder="License Photo URL" className="input-modern" style={{ gridColumn: '1/-1' }} value={formData.licensePhoto} onChange={handleChange} />
        
        <button type="submit" className="btn-primary" style={{ gridColumn: '1/-1', marginTop: '10px' }} disabled={loading}>
          {loading ? 'Saving...' : 'Submit Documents'}
        </button>
      </form>
    </div>
  );
};

export default DriverProfileForm;


