const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/user");
const PasswordResetToken = require("../models/passwordResetToken");

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "Gmail", // Or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Signup endpoint
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
      password, // Password will be hashed by pre-save hook
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

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.log("Login failed: User not found for email:", normalizedEmail);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("Login failed: Incorrect password for email:", normalizedEmail);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, { expiresIn: "1h" });

    console.log("Login successful for email:", normalizedEmail);
    res.json({ token, role: user.role });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error: Failed to log in" });
  }
});

// IsLoggedIn endpoint
router.get("/isLoggedIn", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.json({ isLoggedIn: false });
    }

    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.json({ isLoggedIn: false });
    }

    res.json({ isLoggedIn: true, role: user.role });
  } catch (err) {
    console.error("isLoggedIn error:", err);
    res.json({ isLoggedIn: false });
  }
});

// Forgot Password endpoint
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour expiration

    // Save reset token
    await PasswordResetToken.findOneAndUpdate(
      { userId: user._id },
      { userId: user._id, token, expires },
      { upsert: true }
    );

    // Send email
    const resetLink = `https://gift-well-frontend.vercel.app/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: normalizedEmail,
      subject: "GiftWell Password Reset",
      html: `
        <p>You requested a password reset for your GiftWell account.</p>
        <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Password reset link sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error sending reset link" });
  }
});

// Reset Password endpoint
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "Email, token, and new password are required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = await PasswordResetToken.findOne({
      userId: user._id,
      token,
      expires: { $gt: new Date() },
    });

    if (!resetToken) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Update password (hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Delete used token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
});

module.exports = router;