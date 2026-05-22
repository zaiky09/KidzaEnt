// Delivery-fee calculator. All pricing is read from env vars at call time
// so config can be tuned on Render without a code deploy.
//
// Inputs:
//   dropoffLat, dropoffLng — required customer coordinates
//   subtotal               — item subtotal in KES (for free-delivery threshold)
//   distanceMeters         — OPTIONAL real driving distance from the client.
//                            If provided AND sane (0 < d < 500km), it's used.
//                            Otherwise we approximate via great-circle * 1.3.
//
// Returns: { distanceKm, deliveryFee, free }

const env = (key, fallback) => {
  const v = process.env[key];
  return v == null || v === '' ? fallback : v;
};

function getConfig() {
  return {
    warehouseLat: Number(env('WAREHOUSE_LAT', -1.2921)),
    warehouseLng: Number(env('WAREHOUSE_LNG', 36.8219)),
    baseFee: Number(env('DELIVERY_BASE_FEE', 100)),
    perKm: Number(env('DELIVERY_PER_KM', 30)),
    freeThreshold: Number(env('DELIVERY_FREE_THRESHOLD', 5000)),
    // Road factor for the haversine fallback — typical roads are 1.2-1.4x
    // straight-line. Pick something in the middle.
    roadFactor: Number(env('DELIVERY_ROAD_FACTOR', 1.3))
  };
}

// Haversine: great-circle distance in km between two lat/lng points.
function haversineKm(a, b) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeDeliveryFee({ dropoffLat, dropoffLng, subtotal = 0, distanceMeters = null }) {
  const cfg = getConfig();
  const origin = { lat: cfg.warehouseLat, lng: cfg.warehouseLng };
  const dest = { lat: Number(dropoffLat), lng: Number(dropoffLng) };

  if (!Number.isFinite(dest.lat) || !Number.isFinite(dest.lng)) {
    throw new Error('dropoff coordinates are not finite numbers');
  }

  // Pick the most accurate distance we can trust.
  let distanceKm;
  let source;
  if (Number.isFinite(distanceMeters) && distanceMeters > 0 && distanceMeters < 500_000) {
    // Sanity check: client-reported driving distance shouldn't be wildly
    // smaller than the straight-line minimum.
    const straightKm = haversineKm(origin, dest);
    const clientKm = distanceMeters / 1000;
    if (clientKm < straightKm * 0.7) {
      // Suspiciously short — likely tampered. Fall back to haversine.
      distanceKm = straightKm * cfg.roadFactor;
      source = 'haversine_fallback';
    } else {
      distanceKm = clientKm;
      source = 'driving';
    }
  } else {
    distanceKm = haversineKm(origin, dest) * cfg.roadFactor;
    source = 'haversine';
  }

  // Free delivery on big orders.
  if (subtotal >= cfg.freeThreshold) {
    return { distanceKm, deliveryFee: 0, free: true, source };
  }

  // Round delivery fee up to the nearest shilling for clean STK-push amounts.
  const fee = Math.ceil(cfg.baseFee + cfg.perKm * distanceKm);
  return { distanceKm, deliveryFee: fee, free: false, source };
}

module.exports = { computeDeliveryFee, haversineKm, getConfig };
