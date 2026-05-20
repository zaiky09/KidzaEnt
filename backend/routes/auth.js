// Purpose: Handles User Registration, Login, and Password Recovery with multi-provider support
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

// --- GATEKEEPER: VALIDATION HELPER ---
const validateInputs = (email, phone) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(?:254|\+254|0)?(7|1)\d{8}$/; // Kenyan Standard
    return emailRegex.test(email) && phoneRegex.test(phone);
};

// --- EMAIL TRANSPORTER SETUP ---
// This uses the EMAIL_SERVICE from your .env (gmail, outlook, or yahoo)
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Reminder: Must be an App Password, not login password
    }
});

// Quick debug: This runs when the server starts to check if your credentials work
transporter.verify((error, success) => {
    if (error) {
        console.log("❌ Email Service Error:", error.message);
    } else {
        console.log(`✅ Email Service Ready (${process.env.EMAIL_SERVICE || 'gmail'})`);
    }
});

// 1. Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { username, email, phone, password, role } = req.body;

        if (!validateInputs(email, phone)) {
            return res.status(400).json({ message: 'Invalid email format or Kenyan phone number.' });
        }

        const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with that phone or email.' });
        }

        const publicRoles = ['customer', 'driver'];
        const finalRole = publicRoles.includes(role) ? role : 'customer';

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            email,
            phone,
            password: hashedPassword,
            role: finalRole
        });

        await newUser.save();
        res.status(201).json({ message: `Account created successfully as ${finalRole}` });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during signup' });
    }
});

// 2. Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find by email OR phone
        const user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone: email }] });
        
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET || 'supersecretkey',
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Logged in successfully!',
            token,
            role: user.role,
            username: user.username
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});

// 3. Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: "Email not found." });

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; 
        await user.save();

        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

        const mailOptions = {
            to: user.email,
            from: `"Kidza Support" <${process.env.EMAIL_USER}>`,
            subject: 'Kidza - Password Reset Request',
            html: `
                <h3>Password Reset Request</h3>
                <p>You requested a password reset for your Kidza account.</p>
                <p>Please click the link below to set a new password. This link expires in 1 hour:</p>
                <a href="${resetUrl}">${resetUrl}</a>
                <br/><br/>
                <p>If you didn't request this, you can safely ignore this email.</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Reset link sent to email!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending reset email.' });
    }
});

// 4. Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        res.json({ message: 'Password successfully updated!' });

    } catch (error) {
        res.status(500).json({ message: 'Error resetting password.' });
    }
});

module.exports = router;


