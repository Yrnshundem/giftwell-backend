require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const cart = require("./models/cart");
const order = require('./models/order');
const orderRoutes = require('./routes/order');
const paymentRoutes = require('./routes/payment');




const authenticate = require("./middleware/authenticate");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "http://127.0.0.1:5500", // Adjust if hosted
    credentials: true
}));
app.use(bodyParser.json());

app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes); // Adjust path if needed


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Models
const User = mongoose.model("User", new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "user" }
}));

const Payment = mongoose.model("Payment", new mongoose.Schema({
    fullName: String,
    cardNumber: String,
    expiryDate: String,
    cvv: String,
    amount: Number,
    timestamp: { type: Date, default: Date.now }
}));




const BitcoinPayment = mongoose.model("BitcoinPayment", new mongoose.Schema({
    fullName: String,
    email: String,
    amount: Number,
    chargeId: String,
    status: String,
    timestamp: { type: Date, default: Date.now }
}));

// Helpers
const encryptCard = (data) => CryptoJS.AES.encrypt(data, process.env.SECRET_KEY).toString();

// Routes

// Signup
app.post("/api/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.json({ success: false, message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ fullName, email, password: hashedPassword });
    await newUser.save();

    res.json({ success: true, message: "User created successfully" });
});

// Login
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ success: false, error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.SECRET_KEY, { expiresIn: "1h" });
    res.json({ success: true, token, role: user.role });
});

// Check Login
app.get("/api/isLoggedIn", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ isLoggedIn: false, message: "No token provided" });

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        res.json({ isLoggedIn: true, role: decoded.role, userId: decoded.id });
    } catch {
        res.json({ isLoggedIn: false, message: "Invalid token" });
    }
});

// Logout
app.post("/api/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
});

// Profile Update
app.put("/api/user/update", authenticate, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const updatedUser = await User.findOneAndUpdate(
            { email: userEmail },
            { $set: req.body },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ error: "User not found" });
        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Payment (Card)
app.post("/api/payment", async (req, res) => {
    const { fullName, cardNumber, expiryDate, cvv, amount } = req.body;

    const encryptedCardNumber = encryptCard(cardNumber);
    const encryptedCvv = encryptCard(cvv);

    const newPayment = new Payment({ fullName, cardNumber: encryptedCardNumber, expiryDate, cvv: encryptedCvv, amount });
    await newPayment.save();

    res.json({ success: true, message: "Payment stored securely" });
});

// Bitcoin Payment
app.post("/api/coinbase/payment", async (req, res) => {
    const { fullName, email, amount, chargeId, status } = req.body;

    if (!fullName || !email || !amount || !chargeId || !status) {
        return res.status(400).json({ success: false, message: "Missing required payment data" });
    }

    try {
        const btcPayment = new BitcoinPayment({ fullName, email, amount, chargeId, status });
        await btcPayment.save();
        res.json({ success: true, message: "Bitcoin payment recorded successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to store Bitcoin payment" });
    }
});

// Order History (Admin)
app.get("/api/order_history", async (req, res) => {
    const orders = await Order.find();
    res.json(orders);
});

// Cart: Add
app.post("/api/cart/add", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, price, image, quantity = 1 } = req.body;

        let cart = await Cart.findOne({ userId });
        if (!cart) cart = new Cart({ userId, items: [] });

        const existingItem = cart.items.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ name, price, image, quantity });
        }

        await cart.save();
        res.status(200).json({ message: "Item added to cart", cart });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cart: Fetch
app.get("/api/cart", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });
        res.json({ items: cart?.items || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cart: Remove
app.delete("/api/cart/remove/:name", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.params;

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ error: "Cart not found" });

        cart.items = cart.items.filter(item => item.name !== name);
        await cart.save();

        res.json({ message: "Item removed from cart", cart });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
