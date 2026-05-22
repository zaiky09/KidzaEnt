// Modal that lets the customer rate + comment on an item from a delivered
// order. Parent passes the item (with name) and a submit handler.

import { useState } from 'react';
import StarRating from './StarRating';

const overlayStyle = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(17,24,39,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 10000, padding: '20px'
};
const modalStyle = {
  backgroundColor: '#fff', borderRadius: '16px', padding: '28px',
  width: '100%', maxWidth: '440px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)'
};

const ReviewModal = ({ item, onClose, onSubmit, saving }) => {
  const [rating, setRating] = useState(item?.existingReview?.rating || 0);
  const [comment, setComment] = useState(item?.existingReview?.comment || '');
  const [error, setError] = useState('');

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1) { setError('Pick a rating between 1 and 5 stars.'); return; }
    setError('');
    try {
      await onSubmit({ rating, comment: comment.trim() });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save the review. Try again.');
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>Review · {item.name}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: '#6B7280' }}>×</button>
        </div>
        <p style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '20px' }}>How was it? Other customers will see your rating.</p>

        {error && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.85rem', marginBottom: '15px', fontWeight: 600 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <StarRating rating={rating} onChange={setRating} size={36} />
            <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#6B7280' }}>
              {rating === 0 ? 'Tap a star' : `${rating} / 5`}
            </div>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Anything you'd want a future buyer to know? (optional)"
            className="input-modern"
            style={{ width: '100%', minHeight: '90px', resize: 'vertical', marginBottom: '20px' }}
            maxLength={500}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF', color: '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving || rating < 1}>
              {saving ? 'Saving…' : 'Post review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
