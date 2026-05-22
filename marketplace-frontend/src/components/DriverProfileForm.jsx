import { useState, useEffect } from 'react';
import api from '../api';
import FileUpload from './FileUpload';

// Validation rules tuned to Kenyan documents. National ID is the old
// 8-digit serial; license number is alphanumeric and typically 6-12 chars;
// vehicle registration uses the K-prefix pattern (KAA 123X / KCA 123X etc.)
const NATIONAL_ID_RE = /^\d{7,9}$/;
const LICENSE_RE = /^[A-Z0-9]{5,15}$/i;
const VEHICLE_REG_RE = /^K[A-Z]{2}\s?\d{3}[A-Z]$/i;

const validate = (form) => {
  if (!NATIONAL_ID_RE.test(form.nationalId)) return 'National ID must be 7–9 digits.';
  if (!LICENSE_RE.test(form.licenseNumber)) return 'License number must be 5–15 letters/digits.';
  if (!VEHICLE_REG_RE.test(form.vehicleReg.replace(/\s+/g, ' ').trim())) return 'Vehicle registration should look like "KCA 123X".';
  if (!form.vehicleColor) return 'Vehicle color is required.';
  if (!form.idPhoto) return 'A photo of your national ID is required.';
  if (!form.licensePhoto) return 'A photo of your driving license is required.';
  if (!form.profilePhoto) return 'Please upload a profile photo so customers can identify you.';
  return null;
};

const DriverProfileForm = ({ onProfileSubmit }) => {
  const [formData, setFormData] = useState({
    nationalId: '', idPhoto: '', licenseNumber: '', licensePhoto: '',
    vehicleReg: '', vehicleType: 'Motorbike', vehicleColor: '', profilePhoto: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchExistingData = async () => {
      try {
        const res = await api.get('/api/users/me');
        if (res.data.driverDetails) setFormData((prev) => ({ ...prev, ...res.data.driverDetails }));
      } catch { console.log("New user, no profile found."); }
    };
    fetchExistingData();
  }, []);

  const handleField = (name) => (e) => {
    setFormData({ ...formData, [name]: e.target.value });
  };
  const handleUploaded = (name) => (url) => {
    setFormData({ ...formData, [name]: url });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validate(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await api.put('/api/users/complete-profile', formData);
      setMessage('✅ Profile submitted! Waiting for admin verification.');
      setTimeout(() => { if (onProfileSubmit) onProfileSubmit(); }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Submission failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ maxWidth: '640px', margin: '20px auto', padding: '30px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '8px' }}>Driver Compliance Details</h3>
      <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.85rem', marginBottom: '24px' }}>
        Upload clear photos of your ID and driving license. An admin will review within 24 hours.
      </p>

      {message && <div style={{ padding: '12px', background: '#ECFDF5', color: '#065F46', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontWeight: 700 }}>{message}</div>}
      {error && <div style={{ padding: '12px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontWeight: 600 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <input name="nationalId" placeholder="National ID (e.g. 12345678)" required className="input-modern" value={formData.nationalId} onChange={handleField('nationalId')} inputMode="numeric" />
        <input name="licenseNumber" placeholder="DL Number" required className="input-modern" value={formData.licenseNumber} onChange={handleField('licenseNumber')} />

        <input name="vehicleReg" placeholder="Vehicle Reg (KCA 123X)" required className="input-modern" value={formData.vehicleReg} onChange={handleField('vehicleReg')} style={{ textTransform: 'uppercase' }} />
        <select name="vehicleType" className="input-modern" value={formData.vehicleType} onChange={handleField('vehicleType')}>
          <option value="Motorbike">Motorbike</option>
          <option value="Tuk Tuk">Tuk Tuk</option>
          <option value="Car">Car</option>
          <option value="Van">Van</option>
        </select>

        <input name="vehicleColor" placeholder="Vehicle color" required className="input-modern" value={formData.vehicleColor} onChange={handleField('vehicleColor')} />
        <div /> {/* spacer */}

        <div style={{ gridColumn: '1/-1', borderTop: '1px solid #E5E7EB', paddingTop: '15px' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', color: '#111827' }}>📷 Required photos</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <FileUpload label="National ID photo" value={formData.idPhoto} onChange={handleUploaded('idPhoto')} />
            <FileUpload label="License photo" value={formData.licensePhoto} onChange={handleUploaded('licensePhoto')} />
            <FileUpload label="Your profile photo" value={formData.profilePhoto} onChange={handleUploaded('profilePhoto')} />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ gridColumn: '1/-1', marginTop: '10px', padding: '14px' }} disabled={loading}>
          {loading ? 'Saving…' : 'Submit Documents'}
        </button>
      </form>
    </div>
  );
};

export default DriverProfileForm;
