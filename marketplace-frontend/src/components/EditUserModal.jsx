import { useState, useEffect } from 'react';

const overlayStyle = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10000, padding: '20px'
};

const modalStyle = {
  backgroundColor: '#fff', borderRadius: '16px', padding: '30px',
  width: '100%', maxWidth: '440px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
  animation: 'fadeIn 0.18s ease-out'
};

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px' };
const labelStyle = { fontSize: '0.8rem', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.03em' };

const EditUserModal = ({ user, onClose, onSave, saving }) => {
  const [form, setForm] = useState({ username: '', email: '', phone: '', role: 'customer' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'customer'
      });
      setError('');
    }
  }, [user]);

  if (!user) return null;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const phoneRegex = /^(?:254|\+254|0)?(7|1)\d{8}$/;
    if (!phoneRegex.test(form.phone)) return setError('Phone must be a valid Kenyan number.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Email is not valid.');

    try {
      await onSave(user._id, form);
    } catch (err) {
      setError(err?.response?.data?.message || 'Update failed.');
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>Edit User</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6B7280' }}>×</button>
        </div>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.85rem', marginBottom: '15px', fontWeight: '600' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="edit-username">Username</label>
            <input id="edit-username" name="username" className="input-modern" value={form.username} onChange={handleChange} required />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="edit-email">Email</label>
            <input id="edit-email" name="email" type="email" className="input-modern" value={form.email} onChange={handleChange} required />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="edit-phone">Phone</label>
            <input id="edit-phone" name="phone" type="tel" className="input-modern" value={form.phone} onChange={handleChange} required placeholder="0712345678" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="edit-role">Role</label>
            <select id="edit-role" name="role" className="input-modern" value={form.role} onChange={handleChange}>
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', color: '#374151', fontWeight: '600', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
