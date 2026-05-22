// Resolves the current pricing config by layering three sources in order
// of precedence: DB (Settings collection) → env vars → hard-coded defaults.
// The DB read is cached in memory because we read it on every /quote and
// /orders POST; cache is invalidated by the PUT /api/settings handler.

const Settings = require('../models/Settings');

const HARD_DEFAULTS = {
  warehouseLat: -1.2921,
  warehouseLng: 36.8219,
  deliveryBaseFee: 100,
  deliveryPerKm: 30,
  deliveryFreeThreshold: 5000,
  deliveryRoadFactor: 1.3
};

const ENV_KEYS = {
  warehouseLat: 'WAREHOUSE_LAT',
  warehouseLng: 'WAREHOUSE_LNG',
  deliveryBaseFee: 'DELIVERY_BASE_FEE',
  deliveryPerKm: 'DELIVERY_PER_KM',
  deliveryFreeThreshold: 'DELIVERY_FREE_THRESHOLD',
  deliveryRoadFactor: 'DELIVERY_ROAD_FACTOR'
};

function getEnvConfig() {
  const cfg = {};
  for (const [key, envKey] of Object.entries(ENV_KEYS)) {
    const v = process.env[envKey];
    if (v != null && v !== '' && Number.isFinite(Number(v))) {
      cfg[key] = Number(v);
    }
  }
  return cfg;
}

// Module-level cache. 5-minute TTL is plenty since we also invalidate
// explicitly when the admin saves new settings.
let cache = null;
let cacheTime = 0;
const TTL_MS = 5 * 60 * 1000;

async function getSettings() {
  if (cache && Date.now() - cacheTime < TTL_MS) return cache;

  let dbConfig = {};
  try {
    const doc = await Settings.findOne().lean();
    if (doc) {
      // Strip mongoose internals; only keep our pricing fields with valid numbers.
      for (const key of Object.keys(HARD_DEFAULTS)) {
        if (Number.isFinite(doc[key])) dbConfig[key] = doc[key];
      }
    }
  } catch (err) {
    console.error('[settings] DB read failed, falling back to env/defaults:', err.message);
  }

  cache = { ...HARD_DEFAULTS, ...getEnvConfig(), ...dbConfig };
  cacheTime = Date.now();
  return cache;
}

function invalidateSettingsCache() {
  cache = null;
  cacheTime = 0;
}

module.exports = { getSettings, invalidateSettingsCache, HARD_DEFAULTS };
