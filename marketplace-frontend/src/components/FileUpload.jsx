// File upload bound to Cloudinary's unsigned upload endpoint. The actual
// upload is a one-shot fetch — no signed URL needed because the preset is
// configured as Unsigned in the Cloudinary dashboard.
//
// Props:
//   value          — current URL string (controlled)
//   onChange(url)  — fires once the upload completes with the resulting URL
//   label          — visible label
//   accept         — input accept attribute (default 'image/*')

import { useState } from 'react';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary env vars not set — see .env / Vercel');
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upload failed (${res.status}): ${body.slice(0, 120)}`);
  }
  const data = await res.json();
  return data.secure_url;
}

const FileUpload = ({ value, onChange, label, accept = 'image/*' }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File is bigger than 5 MB — please pick a smaller image.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>{label}</label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {value ? (
          <img src={value} alt={label} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
        ) : (
          <div style={{ width: '60px', height: '60px', borderRadius: '8px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#9CA3AF' }}>📷</div>
        )}
        <label style={{ flex: 1, cursor: uploading ? 'wait' : 'pointer', padding: '10px 12px', border: '1px dashed #D1D5DB', borderRadius: '8px', textAlign: 'center', fontSize: '0.85rem', color: '#374151', backgroundColor: '#FAFAFA' }}>
          <input type="file" accept={accept} onChange={handleFile} disabled={uploading} style={{ display: 'none' }} />
          {uploading ? 'Uploading…' : (value ? 'Replace' : 'Choose a file')}
        </label>
      </div>
      {error && <span style={{ fontSize: '0.78rem', color: '#B91C1C' }}>{error}</span>}
    </div>
  );
};

export default FileUpload;
