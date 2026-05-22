// Full-screen image viewer. Click the backdrop, the close button, or press
// Escape to dismiss. Used by AdminDashboard for inspecting driver KYC docs.

import { useEffect } from 'react';

const PhotoLightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    if (!src) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10001, padding: '20px', cursor: 'zoom-out'
      }}
    >
      <img
        src={src}
        alt={alt || 'Document'}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', cursor: 'default' }}
      />
      {alt && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.6)', color: '#FFF', padding: '6px 14px',
          borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600
        }}>{alt}</div>
      )}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute', top: '20px', right: '20px',
          background: 'white', border: 'none', borderRadius: '50%',
          width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >×</button>
    </div>
  );
};

export default PhotoLightbox;
