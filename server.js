require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const authenticate = require("./middleware/authenticate");
const order = require("./models/order");

const app = express();
const PORT = process.env.PORT || 5000;

// Validate environment variables
if (!process.env.MONGO_URI || !process.env.SECRET_KEY) {
    console.error("Error: MONGO_URI and SECRET_KEY must be defined in .env");
    process.exit(1);
}

app.use(cors({
    origin: "https://gift-well-frontend.vercel.app",
    credentials: true
}));
app.use(express.json());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("Connected to MongoDB"))
  .catch(err => {
      console.error("MongoDB connection error:", err);
      process.exit(1);
  });

const user = mongoose.model("user", new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, default: "user" }
}));

app.post("/api/signup", async (req, res) => {
    const { fullName, email, password } = req.body;
    try {
        const existingUser = await user.findOne({ email });
        if (existingUser) return res.json({ success: false, message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new user({ fullName, email, password: hashedPassword });
        await newUser.save();

        res.json({ success: true, message: "User created successfully" });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ success: false, message: "Signup failed" });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const userInstance = await user.findOne({ email });
        if (!userInstance || !(await bcrypt.compare(password, userInstance.password))) {
            return res.status(400).json({ success: false, error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: userInstance._id, email: userInstance.email, role: userInstance.role }, process.env.SECRET_KEY, {
            expiresIn: "1h"
        });

        res.json({ success: true, token, role: userInstance.role });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, error: "Login failed" });
    }
});

app.get("/api/isLoggedIn", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.json({ isLoggedIn: false });

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        res.json({ isLoggedIn: true, role: decoded.role, userId: decoded.id });
    } catch (error) {
        console.error("isLoggedIn error:", error);
        res.json({ isLoggedIn: false });
    }
});

app.post("/api/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
});

app.put("/api/user/update", authenticate, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const updatedUser = await user.findOneAndUpdate(
            { email: userEmail },
            { $set: req.body },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ error: "User not found" });
        res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
        console.error("User update error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/api/order_history", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await order.find({ userId }); // Filter by userId
        res.json(orders);
    } catch (err) {
        console.error("Order history error:", err);
        res.status(500).json({ error: "Failed to fetch order history" });
    }
});

app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
