const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const router = express.Router();

console.log("Loading auth.js routes");

router.get("/test", (req, res) => {
    console.log("Accessed /api/auth/test");
    res.json({ message: "Auth test route working" });
});

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

module.exports = router;