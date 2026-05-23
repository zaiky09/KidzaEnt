// Purpose: Handles User Registration, Login, and Password Recovery with multi-provider support
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { getTransporter } = require('../utils/mailer');

const router = express.Router();

// --- GATEKEEPER: VALIDATION HELPERS ---
const MIN_PASSWORD_LENGTH = 8;

const validateInputs = (email, phone) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^(?:254|\+254|0)?(7|1)\d{8}$/; // Kenyan Standard
    return emailRegex.test(email) && phoneRegex.test(phone);
};

const validatePassword = (password) => {
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return null;
};

// Reset tokens go out to the user in plaintext (in the email link) but are
// stored hashed in the DB. A DB leak then cannot be turned into valid resets.
const hashResetToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Shared pooled transporter (port 587 + STARTTLS + short timeouts).
// utils/mailer.js handles the boot-time verify so we don't duplicate logs.
const transporter = getTransporter();

// 1. Signup Route
router.post('/signup', async (req, res) => {
    try {
        const { username, email, phone, password, role } = req.body;

        if (!validateInputs(email, phone)) {
            return res.status(400).json({ message: 'Invalid email format or Kenyan phone number.' });
        }
        const pwError = validatePassword(password);
        if (pwError) return res.status(400).json({ message: pwError });

        const existingUser = await User.findOne({ $or: [{ phone }, { email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with that username, phone, or email.' });
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
        const { email, password } = req.body || {};

        // Guard against missing fields so .toLowerCase() doesn't throw and
        // we return a clean 400 the user can act on.
        if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // Find by email OR phone
        const user = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone: email }] });

        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        // Older accounts may have a missing or non-string password field
        // (e.g. migrated from another system). bcrypt.compare throws on those.
        if (typeof user.password !== 'string' || !user.password) {
            console.error(`[login] user ${user._id} has no usable password hash`);
            return res.status(400).json({ message: 'This account needs a password reset. Use Forgot Password.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Logged in successfully!',
            token,
            role: user.role,
            username: user.username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Server error during login',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// 3. Forgot Password Route — always returns the same generic message to avoid
// leaking whether an email is registered. Actual email send happens out-of-band.
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body || {};
    const generic = { message: 'If that address has an account, a reset link has been sent.' };

    if (typeof email !== 'string' || !email.trim()) {
        return res.json(generic);
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.json(generic);

        const rawToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = hashResetToken(rawToken);
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

        await transporter.sendMail({
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
        });

        res.json(generic);
    } catch (error) {
        console.error('forgot-password error:', error);
        // Still return generic to avoid signaling failure modes
        res.json(generic);
    }
});

// 4. Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
    try {
        const pwError = validatePassword(req.body?.password);
        if (pwError) return res.status(400).json({ message: pwError });

        const hashed = hashResetToken(req.params.token);
        const user = await User.findOne({
            resetPasswordToken: hashed,
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
        console.error('reset-password error:', error);
        res.status(500).json({ message: 'Error resetting password.' });
    }
});

module.exports = router;


