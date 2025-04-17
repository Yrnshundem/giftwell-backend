const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); // Use bcryptjs for consistency
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

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

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user"
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

module.exports = router;
