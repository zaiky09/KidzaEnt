const express = require('express');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const router = express.Router();

// Shared mailer for driver-status notifications.
const mailer = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Same regexes the frontend uses, so a tampered/curl request hits the same wall.
const NATIONAL_ID_RE = /^\d{7,9}$/;
const LICENSE_RE = /^[A-Z0-9]{5,15}$/i;
const VEHICLE_REG_RE = /^K[A-Z]{2}\s?\d{3}[A-Z]$/i;
const URL_RE = /^https:\/\/.+\..+/;

// ==========================================
// DRIVER ROUTES (Token required, but not admin)
// ==========================================

// 1. Get current driver's own profile (For pre-filling the edit form)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

// 2. Complete Driver Profile (KYC). Validates server-side so curl can't
// bypass the frontend rules.
router.put('/complete-profile', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can submit compliance profiles.' });
    }

    const allowedFields = ['nationalId', 'idPhoto', 'licenseNumber', 'licensePhoto', 'vehicleReg', 'vehicleType', 'vehicleColor', 'profilePhoto'];
    const d = {};
    for (const k of allowedFields) if (req.body?.[k] != null) d[k] = String(req.body[k]).trim();

    if (!NATIONAL_ID_RE.test(d.nationalId || '')) return res.status(400).json({ message: 'National ID must be 7–9 digits.' });
    if (!LICENSE_RE.test(d.licenseNumber || '')) return res.status(400).json({ message: 'License number must be 5–15 letters/digits.' });
    if (!VEHICLE_REG_RE.test((d.vehicleReg || '').replace(/\s+/g, ' '))) return res.status(400).json({ message: 'Vehicle registration should look like "KCA 123X".' });
    if (!d.vehicleColor) return res.status(400).json({ message: 'Vehicle color is required.' });
    if (!URL_RE.test(d.idPhoto || '')) return res.status(400).json({ message: 'National ID photo upload is required.' });
    if (!URL_RE.test(d.licensePhoto || '')) return res.status(400).json({ message: 'License photo upload is required.' });
    if (!URL_RE.test(d.profilePhoto || '')) return res.status(400).json({ message: 'Profile photo upload is required.' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.driverDetails = d;
    user.isProfileComplete = true;
    user.isApproved = false; // re-verification required after every edit

    await user.save();
    res.json({ message: 'Profile submitted successfully! Waiting for admin approval.' });
  } catch (error) {
    console.error('Error completing profile:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// ==========================================
// ADMIN ROUTES (Token AND Admin role required)
// ==========================================

// 2. Approve / Reject driver. Accepts:
//   { isApproved: true }                          → approval (clears reason)
//   { isApproved: false, reason: 'Blurry ID' }    → rejection with reason
//   { isApproved: false }                         → silent unapprove (no email)
// On state change we email the driver (best-effort — failure to send email
// never blocks the DB write). When rejecting, the reason is in the email.
router.put('/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const previousState = !!user.isApproved;
    const willApprove = !!req.body.isApproved;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';

    if (!willApprove && reason && reason.length > 500) {
      return res.status(400).json({ message: 'Reason must be 500 characters or fewer.' });
    }

    user.isApproved = willApprove;
    user.rejectionReason = willApprove ? undefined : (reason || user.rejectionReason);
    await user.save();

    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://kidzaent.vercel.app';
    const reasonBlock = reason
      ? `<p><strong>Reason given by the team:</strong></p>
         <blockquote style="margin:0 0 10px 0;padding:10px 14px;border-left:3px solid #F5B041;background:#FFFBEB;color:#92400E;">${reason.replace(/[<>&]/g, (c) => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[c]))}</blockquote>`
      : '';

    const shouldEmail =
      user.role === 'driver' &&
      user.email &&
      (previousState !== user.isApproved || (!willApprove && reason));

    if (shouldEmail) {
      const subject = willApprove ? 'You are approved as a Kidza driver' : 'Update on your Kidza driver application';
      const html = willApprove
        ? `<p>Hi ${user.username},</p>
           <p>Welcome aboard 🚗 — your Kidza driver application has been approved. You can start accepting delivery requests right away.</p>
           <p>Log in at <a href="${FRONTEND_URL}/driver">your driver hub</a> to see available trips.</p>
           <p style="color:#6B7280;font-size:13px;">If this wasn't you, please reply to this email immediately.</p>`
        : `<p>Hi ${user.username},</p>
           <p>We've reviewed your Kidza driver application and we can't approve it as-is.</p>
           ${reasonBlock}
           <p>Please update your details at <a href="${FRONTEND_URL}/driver">your driver hub</a> and resubmit. Reach out at <a href="mailto:${process.env.EMAIL_USER}">${process.env.EMAIL_USER}</a> if anything is unclear.</p>`;
      mailer.sendMail({
        to: user.email,
        from: `"Kidza Marketplace" <${process.env.EMAIL_USER}>`,
        subject,
        html
      }).catch((err) => console.error('[driver-approval-email] failed:', err.message));
    }

    res.json({
      message: willApprove
        ? 'Driver approved.'
        : (reason ? 'Driver rejected with reason.' : 'Driver approval revoked.')
    });
  } catch (error) {
    console.error('Approve driver error:', error);
    res.status(500).json({ message: 'Error updating approval status.' });
  }
});

// 3. Get users by role
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const role = req.query.role;
    // if (!role) return res.status(400).json({ message: 'Role query parameter is required.' });
    const users = await User.find(role ? { role } : {}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

// 4. Create a new user
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { username, email, phone, password, role, location } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { phone }, { username }] });
    if (existingUser) return res.status(400).json({ message: 'User already exists.' });


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);


    const newUser = new User({ username, email, phone, password: hashedPassword, role: role || 'customer', location });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating user.' });
  }
});


// 5. Update a user
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, phone, role, location } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });


    if (username) user.username = username;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (location) user.location = location;


    await user.save();
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user.' });
  }
});


// 6. Delete a user
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});


module.exports = router;



