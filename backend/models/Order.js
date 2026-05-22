//Purpose: Tracks purchases, delivery status, and driver assignments

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // CHANGED: This is now an array holding multiple items and their quantities!
  items: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'CatalogItem', required: true },
    quantity: { type: Number, required: true }
  }],
  
  status: { type: String, enum: ['pending', 'accepted_by_driver', 'in_transit', 'delivered', 'cancelled'], default: 'pending' },
  expectedDeliveryDate: { type: Date, required: true },
  deliveryAddress: { type: String, required: true },
  customerPhone: { type: String, required: true },
  dropoffLat: { type: Number, required: true },
  dropoffLng: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['mpesa_upfront', 'mpesa_on_delivery'], default: 'mpesa_on_delivery' },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },

  // Daraja STK-push correlation fields. Set when we initiate STK push;
  // mpesaReceiptNumber filled in by Safaricom's callback on success.
  mpesaCheckoutRequestId: { type: String, index: true },
  mpesaMerchantRequestId: { type: String },
  mpesaReceiptNumber: { type: String },
  mpesaResultDesc: { type: String },

  // Pricing breakdown. itemSubtotal + deliveryFee = totalPrice.
  itemSubtotal: { type: Number, required: true },
  deliveryFee: { type: Number, required: true, default: 0 },
  distanceKm: { type: Number },
  totalPrice: { type: Number, required: true },

  totalWeightKg: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);


