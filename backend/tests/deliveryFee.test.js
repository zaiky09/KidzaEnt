const { computeDeliveryFee, haversineKm, getEnvDefaults } = require('../utils/deliveryFee');

// Reset any test env overrides between cases.
const ORIGINAL = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('computeDeliveryFee', () => {
  test('haversine returns ~0 km when origin and destination match', () => {
    const cfg = getEnvDefaults();
    const d = haversineKm({ lat: cfg.warehouseLat, lng: cfg.warehouseLng }, { lat: cfg.warehouseLat, lng: cfg.warehouseLng });
    expect(d).toBeCloseTo(0, 5);
  });

  test('uses haversine fallback when distanceMeters is missing', () => {
    // 0.1° latitude ≈ 11.1 km from Nairobi CBD
    const { distanceKm, deliveryFee, source, free } = computeDeliveryFee({
      dropoffLat: -1.2921 + 0.1, dropoffLng: 36.8219, subtotal: 1000
    });
    expect(source).toBe('haversine');
    expect(distanceKm).toBeGreaterThan(13); // 11.1 * 1.3 road factor
    expect(deliveryFee).toBeGreaterThan(100); // base + per-km
    expect(free).toBe(false);
  });

  test('trusts client driving distance when it is plausibly larger than straight-line', () => {
    // Real driving from Nairobi CBD to Westlands ≈ 5-6 km
    const { deliveryFee, source } = computeDeliveryFee({
      dropoffLat: -1.2670, dropoffLng: 36.8104,
      subtotal: 1000,
      distanceMeters: 5500
    });
    expect(source).toBe('driving');
    // base 100 + 30 * 5.5 = 265
    expect(deliveryFee).toBe(Math.ceil(100 + 30 * 5.5));
  });

  test('falls back to haversine when client claims an absurdly small driving distance', () => {
    // Client says "1 meter" for a 20 km destination — clearly tampered.
    const { source } = computeDeliveryFee({
      dropoffLat: -1.0921, dropoffLng: 36.8219, // ~22 km north
      subtotal: 1000,
      distanceMeters: 1
    });
    expect(source).toBe('haversine_fallback');
  });

  test('free delivery applied when subtotal hits the threshold', () => {
    process.env.DELIVERY_FREE_THRESHOLD = '500';
    const { deliveryFee, free } = computeDeliveryFee({
      dropoffLat: -1.0, dropoffLng: 36.9,
      subtotal: 1000
    });
    expect(free).toBe(true);
    expect(deliveryFee).toBe(0);
  });

  test('config can be overridden via env vars', () => {
    process.env.DELIVERY_BASE_FEE = '50';
    process.env.DELIVERY_PER_KM = '10';
    const { deliveryFee } = computeDeliveryFee({
      dropoffLat: -1.2921 + 0.05, dropoffLng: 36.8219, subtotal: 100
    });
    // 50 base + 10 * (~5.55 * 1.3) ≈ ~122
    expect(deliveryFee).toBeLessThan(150);
    expect(deliveryFee).toBeGreaterThan(50);
  });
});
