// Singleton settings document. Stores admin-tunable pricing config so
// changing the delivery fee model doesn't require a Render redeploy.
//
// The collection should only ever hold one document — the route handlers
// use findOneAndUpdate({}, ..., { upsert: true }) to enforce this. If a
// stray second document appears, getSettings() will use the first one.

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    warehouseLat: { type: Number },
    warehouseLng: { type: Number },
    deliveryBaseFee: { type: Number, min: 0 },
    deliveryPerKm: { type: Number, min: 0 },
    deliveryFreeThreshold: { type: Number, min: 0 },
    deliveryRoadFactor: { type: Number, min: 1, max: 3 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
