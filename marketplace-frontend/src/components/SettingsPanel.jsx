// Admin pricing panel. Reads /api/settings, lets the admin tune the six
// delivery-pricing numbers, PUTs on save. Effective values come from
// DB → env vars → hard-coded defaults; blanking a field means "fall back".

import { useEffect, useState } from 'react';
import api from '../api';

const FIELDS = [
  { key: 'warehouseLat', label: 'Warehouse latitude', step: 0.0001, hint: 'Latitude of your dispatch origin.' },
  { key: 'warehouseLng', label: 'Warehouse longitude', step: 0.0001, hint: 'Longitude of your dispatch origin.' },
  { key: 'deliveryBaseFee', label: 'Base fee (KES)', step: 1, hint: 'Flat charge applied to every delivery before per-km.' },
  { key: 'deliveryPerKm', label: 'Per-km rate (KES)', step: 1, hint: 'Multiplied by the driving distance.' },
  { key: 'deliveryFreeThreshold', label: 'Free-delivery threshold (KES)', step: 100, hint: 'Order subtotals at or above this get free delivery.' },
  { key: 'deliveryRoadFactor', label: 'Road factor (haversine ×)', step: 0.05, hint: 'Multiplier used when client-side driving distance is unavailable. 1.0–3.0.' }
];

const SettingsPanel = () => {
  const [settings, setSettings] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { tone, text }

  useEffect(() => {
    api.get('/api/settings')
      .then((res) => {
        setSettings(res.data.settings);
        setDefaults(res.data.defaults);
        setForm({ ...res.data.settings });
      })
      .catch((err) => setMessage({ tone: 'err', text: err?.response?.data?.message || 'Could not load settings.' }))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {};
      for (const { key } of FIELDS) {
        if (form[key] === '' || form[key] === null) continue;
        payload[key] = Number(form[key]);
      }
      const res = await api.put('/api/settings', payload);
      setSettings(res.data.settings);
      setMessage({ tone: 'ok', text: '✅ Settings saved. New pricing applies to the next quote.' });
    } catch (err) {
      setMessage({ tone: 'err', text: err?.response?.data?.message || 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const resetField = (key) => set(key, defaults?.[key] ?? '');

  if (loading) return <p style={{ textAlign: 'center', color: '#6B7280' }}>Loading settings…</p>;

  return (
    <div className="glass-card" style={{ padding: '30px', maxWidth: '720px', margin: '0 auto' }}>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem' }}>Delivery Pricing</h3>
      <p style={{ margin: '0 0 20px 0', color: '#6B7280', fontSize: '0.9rem' }}>
        These values drive every customer's delivery fee in real time. Changes apply on the next cart quote (no redeploy).
      </p>

      {message && (
        <div style={{
          padding: '12px 14px', borderRadius: '8px', marginBottom: '18px', fontWeight: 600, fontSize: '0.9rem',
          backgroundColor: message.tone === 'ok' ? '#ECFDF5' : '#FEE2E2',
          color: message.tone === 'ok' ? '#065F46' : '#B91C1C'
        }}>{message.text}</div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {FIELDS.map(({ key, label, step, hint }) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <label htmlFor={`set-${key}`} style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{label}</label>
              <button
                type="button"
                onClick={() => resetField(key)}
                style={{ fontSize: '0.72rem', color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}
              >Reset to default ({defaults?.[key]})</button>
            </div>
            <input
              id={`set-${key}`}
              type="number"
              step={step}
              className="input-modern"
              value={form[key] ?? ''}
              onChange={(e) => set(key, e.target.value)}
              placeholder={String(defaults?.[key] ?? '')}
            />
            <p style={{ margin: '4px 0 0 4px', fontSize: '0.75rem', color: '#6B7280' }}>{hint}</p>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '14px', backgroundColor: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '0.85rem', color: '#92400E' }}>
          <div>
            <strong>Currently in effect</strong>
            <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
              Base KES {settings?.deliveryBaseFee} · {settings?.deliveryPerKm}/km · Free over KES {settings?.deliveryFreeThreshold}
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={saving} style={{ minWidth: '140px' }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsPanel;
