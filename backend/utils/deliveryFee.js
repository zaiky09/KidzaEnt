// Delivery-fee calculator.
//
// Pricing config is supplied by the caller (typically read from the DB via
// utils/settings.js). Callers can also pass `null` to use env-var defaults,
// useful for unit tests and the rare ad-hoc call.
//
// Inputs:
//   dropoffLat, dropoffLng — required customer coordinates
//   subtotal               — item subtotal in KES (free-threshold)
//   distanceMeters         — OPTIONAL real driving distance from the client
//   config                 — { warehouseLat, warehouseLng, deliveryBaseFee,
//                              deliveryPerKm, deliveryFreeThreshold,
//                              deliveryRoadFactor }

const { HARD_DEFAULTS } = require('./settings');

const env = (key, fallback) => {
  const v = process.env[key];
  return v == null || v === '' ? fallback : v;
};

// Used when callers don't pass an explicit config (mostly tests).
function getEnvDefaults() {
  return {
    warehouseLat: Number(env('WAREHOUSE_LAT', HARD_DEFAULTS.warehouseLat)),
    warehouseLng: Number(env('WAREHOUSE_LNG', HARD_DEFAULTS.warehouseLng)),
    deliveryBaseFee: Number(env('DELIVERY_BASE_FEE', HARD_DEFAULTS.deliveryBaseFee)),
    deliveryPerKm: Number(env('DELIVERY_PER_KM', HARD_DEFAULTS.deliveryPerKm)),
    deliveryFreeThreshold: Number(env('DELIVERY_FREE_THRESHOLD', HARD_DEFAULTS.deliveryFreeThreshold)),
    deliveryRoadFactor: Number(env('DELIVERY_ROAD_FACTOR', HARD_DEFAULTS.deliveryRoadFactor))
  };
}

// Haversine great-circle distance in km.
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeDeliveryFee({ dropoffLat, dropoffLng, subtotal = 0, distanceMeters = null, config = null }) {
  const cfg = config || getEnvDefaults();
  const origin = { lat: cfg.warehouseLat, lng: cfg.warehouseLng };
  const dest = { lat: Number(dropoffLat), lng: Number(dropoffLng) };

  if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) {
    throw new Error('dropoff coordinates are not finite numbers');
  }

  let distanceKm;
  let source;
  if (Number.isFinite(distanceMeters) && distanceMeters > 0 && distanceMeters < 500_000) {
    const straightKm = haversineKm(origin, dest);
    const clientKm = distanceMeters / 1000;
    if (clientKm < straightKm * 0.7) {
      distanceKm = straightKm * cfg.deliveryRoadFactor;
      source = 'haversine_fallback';
    } else {
      distanceKm = clientKm;
      source = 'driving';
    }
  } else {
    distanceKm = haversineKm(origin, dest) * cfg.deliveryRoadFactor;
    source = 'haversine';
  }

  if (subtotal >= cfg.deliveryFreeThreshold) {
    return { distanceKm, deliveryFee: 0, free: true, source };
  }

  const fee = Math.ceil(cfg.deliveryBaseFee + cfg.deliveryPerKm * distanceKm);
  return { distanceKm, deliveryFee: fee, free: false, source };
}

module.exports = { computeDeliveryFee, haversineKm, getEnvDefaults };
