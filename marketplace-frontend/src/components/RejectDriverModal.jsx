// Modal where the admin writes a reason for rejecting (or revoking) a driver.
// Reason is required so drivers always know what to fix.

import { useState } from 'react';

const overlayStyle = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10000, padding: '20px'
};
const modalStyle = {
  backgroundColor: '#fff', borderRadius: '16px', padding: '28px',
  width: '100%', maxWidth: '460px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)'
};

const QUICK_REASONS = [
  'National ID photo is blurry',
  'License photo is blurry',
  'License number does not match the photo',
  'National ID and license name do not match',
  'Vehicle registration is invalid',
  'Photos appear to be of a different person'
];

const RejectDriverModal = ({ driver, mode = 'reject', onClose, onSubmit, saving }) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!driver) return null;
  const isRevoke = mode === 'revoke';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5) {
      setError('Please give the driver at least one full sentence of feedback.');
      return;
    }
    setError('');
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save. Try again.');
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#111827' }}>
          {isRevoke ? 'Revoke approval' : 'Reject application'} — {driver.username}
        </h3>
        <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '18px' }}>
          The driver will receive an email with the reason you write below so they can fix and resubmit.
        </p>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 600 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Quick-pick chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                style={{ fontSize: '0.75rem', padding: '6px 10px', borderRadius: '14px', border: '1px solid #E5E7EB', background: reason === r ? '#FEF3C7' : '#FFF', color: '#374151', cursor: 'pointer' }}
              >{r}</button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Type the reason, or pick a quick option above…"
            className="input-modern"
            style={{ width: '100%', minHeight: '110px', resize: 'vertical', marginBottom: '18px' }}
            maxLength={500}
            autoFocus
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}>
              {saving ? 'Sending…' : (isRevoke ? 'Revoke & notify' : 'Reject & notify')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectDriverModal;
