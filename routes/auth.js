const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
// const nodemailer = require("nodemailer");
// const crypto = require("crypto");
// const PasswordResetToken = require("../models/passwordResetToken");
const router = express.Router();

console.log("Loading auth.js routes");

// const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//     },
// });

router.post("/signup", async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const normalizedEmail = email.toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }
        const user = new User({
            fullName,
            email: normalizedEmail,
            password,
            role: "user",
        });
        await user.save();
        console.log("User created:", { fullName, email: normalizedEmail });
        res.status(201).json({ message: "Sign up successful! Please log in." });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Server error: Failed to sign up" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const normalizedEmail = email.toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.SECRET_KEY || "your-secret-key",
            { expiresIn: "1h" }
        );
        res.json({ token, role: user.role });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error: Failed to login" });
    }
});

// router.post("/forgot-password", async (req, res) => {
//     const { email } = req.body;
//     if (!email) {
//         return res.status(400).json({ message: "Email is required" });
//     }
//     try {
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         const token = crypto.randomBytes(32).toString("hex");
//         const expires = new Date(Date.now() + 3600000);
//         await PasswordResetToken.findOneAndUpdate(
//             { userId: user._id },
//             { userId: user._id, token, expires },
//             { upsert: true }
//         );
//         const resetLink = `https://gift-well-frontend.vercel.app/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
//         const mailOptions = {
//             from: process.env.EMAIL_USER,
//             to: email,
//             subject: "GiftWell Password Reset",
//             html: `<p>You requested a password reset for your GiftWell account.</p>
//                    <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
//                    <p>This link will expire in 1 hour.</p>
//                    <p>If you did not request this, please ignore this email.</p>`,
//         };
//         await transporter.sendMail(mailOptions);
//         res.json({ message: "Password reset link sent to your email" });
//     } catch (error) {
//         console.error("Forgot password error:", error);
//         res.status(500).json({ message: "Error sending reset link" });
//     }
// });

module.exports = router;