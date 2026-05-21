const express = require('express');
const User = require('../models/User');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

const router = express.Router();

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

// 2. Complete Driver Profile (KYC)
router.put('/complete-profile', verifyToken, async (req, res) => {
  try {
    // Only allow drivers to access this specific logic
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can submit compliance profiles.' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Update details and flip the completion flag
    user.driverDetails = req.body;
    user.isProfileComplete = true;

    //Saftey: Reset approval so admin must re-verify changes
    user.isApproved = false;

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

// 2. Approve/Reject Driver
router.put('/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });


    user.isApproved = req.body.isApproved;
    await user.save();


    res.json({ message: `Driver status updated to ${user.isApproved ? 'approved' : 'revoked'}.` });
  } catch (error) {
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



