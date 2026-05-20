const mongoose = require('mongoose');

const catalogItemSchema = new mongoose.Schema({
   name: { type: String, required: true },
   type: { type: String, enum: ['product', 'service'], required: true },
   // NEW: Categories to prevent mixing items
   category: { 
     type: String, 
     required: true,
     enum: [
       // Product Categories
       'Fresh Produce', 'Household Cleaning', 'Beverages', 'Pantry Staples', 'Snacks', 
       // Service Categories
       'Plumbing', 'Cleaning', 'Electrical', 'Beauty & Wellness', 'Other'
     ] 
   },
   price: { type: Number, required: true },
   weightPerItemKg: { type: Number },
   description: { type: String },
   images: [{ type: String }],
   reviews: [{
       customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
       rating: { type: Number, min: 1, max: 5 },
       comment: String,
       createdAt: { type: Date, default: Date.now }
   }]
}, { timestamps: true });

module.exports = mongoose.model('CatalogItem', catalogItemSchema);


