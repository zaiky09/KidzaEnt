// Admin-only endpoints for tuning the delivery-pricing config without a
// Render redeploy. Stored in a Mongo Settings singleton; the in-memory
// cache is invalidated on PUT so the next /quote sees the new values.

const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const { getSettings, invalidateSettingsCache, HARD_DEFAULTS } = require('../utils/settings');

const NUMERIC_KEYS = [
  'warehouseLat',
  'warehouseLng',
  'deliveryBaseFee',
  'deliveryPerKm',
  'deliveryFreeThreshold',
  'deliveryRoadFactor'
];

// GET — returns the effective settings (DB → env → defaults) so the admin
// form can pre-fill with the values currently in effect.
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ settings, defaults: HARD_DEFAULTS });
  } catch (err) {
    console.error('GET /api/settings failed:', err);
    res.status(500).json({ message: 'Could not load settings.' });
  }
});

// PUT — upserts the singleton with whichever numeric fields the admin sent.
// Validates ranges before write; rejects with 400 on any out-of-range value.
router.put('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const update = {};
    for (const key of NUMERIC_KEYS) {
      if (req.body[key] === undefined || req.body[key] === null || req.body[key] === '') continue;
      const n = Number(req.body[key]);
      if (!Number.isFinite(n)) return res.status(400).json({ message: `${key} must be a number.` });
      if (key === 'deliveryRoadFactor' && (n < 1 || n > 3)) {
        return res.status(400).json({ message: 'deliveryRoadFactor must be between 1.0 and 3.0.' });
      }
      if (['deliveryBaseFee', 'deliveryPerKm', 'deliveryFreeThreshold'].includes(key) && n < 0) {
        return res.status(400).json({ message: `${key} cannot be negative.` });
      }
      if (key === 'warehouseLat' && (n < -90 || n > 90)) {
        return res.status(400).json({ message: 'warehouseLat must be between -90 and 90.' });
      }
      if (key === 'warehouseLng' && (n < -180 || n > 180)) {
        return res.status(400).json({ message: 'warehouseLng must be between -180 and 180.' });
      }
      update[key] = n;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No valid fields supplied.' });
    }

    const doc = await Settings.findOneAndUpdate({}, update, {
      upsert: true, new: true, setDefaultsOnInsert: true
    });
    invalidateSettingsCache();

    res.json({ message: 'Settings updated.', settings: doc });
  } catch (err) {
    console.error('PUT /api/settings failed:', err);
    res.status(500).json({ message: 'Could not save settings.' });
  }
});

module.exports = router;
