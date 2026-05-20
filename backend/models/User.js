// Purpose: Secure User Schema with Driver Compliance (KYC) and Password Reset
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
 username: { type: String, required: true, unique: true },
 email: { type: String, required: true, unique: true },
 password: { type: String, required: true },
 phone: { type: String, required: true },
 role: {
   type: String,
   enum: ['customer', 'admin', 'driver'],
   default: 'customer'
 },
 
 // --- PASSWORD RESET FIELDS ---
 resetPasswordToken: { type: String },
 resetPasswordExpires: { type: Date },

 // --- DRIVER COMPLIANCE (KYC) ---
 isApproved: { type: Boolean, default: false }, // Admin flips this to true
 isProfileComplete: { type: Boolean, default: false }, // Driver flips this by submitting form
 driverDetails: {
   nationalId: { type: String },
   idPhoto: { type: String },
   licenseNumber: { type: String },
   licensePhoto: { type: String },
   vehicleReg: { type: String },
   vehicleType: { type: String },
   vehicleColor: { type: String },
   profilePhoto: { type: String }
 },

 location: {
   lat: { type: Number },
   lng: { type: Number },
   address: { type: String }
 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);


