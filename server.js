require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const cartRoutes = require("./routes/cart");
const paymentRoutes = require("./routes/payment");
const authRoutes = require("./routes/auth");
const authenticate = require("./middleware/authenticate");
const Order = require("./models/order");
const nodemailer = require("nodemailer"); 
const crypto = require("crypto"); 
const PasswordResetToken = require("./models/passwordResetToken"); 
const User = require("./models/user");

const app = express();
const PORT = process.env.PORT || 5000;


app.use(
  cors({
    origin: ["https://gift-well-frontend.vercel.app", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(bodyParser.json());


// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Forgot Password Endpoint
app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const user = await User.findOne({ email });
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
        const resetLink = `https://gift-well-frontend.vercel.app/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
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

// Reset Password Endpoint
app.post("/api/auth/reset-password", async (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
        return res.status(400).json({ message: "Email, token, and new password are required" });
    }

    try {
        const user = await User.findOne({ email });
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

        // Update password (assuming User model has a password field and you're using bcrypt)
        const bcrypt = require("bcrypt");
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Delete used token
        await PasswordResetToken.deleteOne({ _id: resetToken._id });

        res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Error resetting password" });
    }
});

if (!process.env.MONGO_URI || !process.env.SECRET_KEY || !process.env.PAYSTACK_SECRET_KEY) {
  console.error("Error: MONGO_URI, SECRET_KEY, and PAYSTACK_SECRET_KEY must be defined in .env");
  process.exit(1);
}



mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);



app.post("/api/paystack/verify", async (req, res) => {
  const { reference, checkoutData } = req.body;
  if (!reference || !checkoutData || !checkoutData.fullName || !checkoutData.phone || !checkoutData.address || !checkoutData.city || !checkoutData.country || !checkoutData.items || !checkoutData.amount) {
    return res.status(400).json({ message: "Reference and complete checkoutData are required" });
  }

  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = response.data;
    if (data.status && data.data.status === "success") {
      const token = req.headers.authorization?.split(" ")[1];
      let userId = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.SECRET_KEY);
          userId = decoded.id;
          // Clear user cart
          await Cart.findOneAndUpdate({ userId }, { items: [], total: 0 });
        } catch (error) {
          console.warn("Invalid token:", error.message);
        }
      }

      const order = new Order({
        userId,
        fullName: checkoutData.fullName,
        phone: checkoutData.phone,
        address: checkoutData.address,
        city: checkoutData.city,
        country: checkoutData.country,
        items: checkoutData.items,
        total: checkoutData.amount,
        paymentMethod: data.data.channel === "apple_pay" ? "applepay" : "card",
        status: "pending",
      });
      await order.save();
      res.json({ status: "success", data: data.data });
    } else {
      res.status(400).json({ message: "Payment verification failed", data });
    }
  } catch (error) {
    console.error("Paystack verification error:", error.response?.data || error.message);
    res.status(500).json({ message: "Error verifying payment", error: error.message });
  }
});

app.post("/api/order/bitcoin", async (req, res) => {
  const { checkoutData } = req.body;
  if (!checkoutData || !checkoutData.fullName || !checkoutData.phone || !checkoutData.address || !checkoutData.city || !checkoutData.country || !checkoutData.items || !checkoutData.amount) {
    return res.status(400).json({ message: "Complete checkoutData is required" });
  }

  try {
    const token = req.headers.authorization?.split(" ")[1];
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        userId = decoded.id;
        // Clear user cart
        await Cart.findOneAndUpdate({ userId }, { items: [], total: 0 });
      } catch (error) {
        console.warn("Invalid token:", error.message);
      }
    }

    const order = new Order({
      userId,
      fullName: checkoutData.fullName,
      phone: checkoutData.phone,
      address: checkoutData.address,
      city: checkoutData.city,
      country: checkoutData.country,
      items: checkoutData.items,
      total: checkoutData.amount,
      paymentMethod: "bitcoin",
      status: "pending",
    });
    await order.save();
    res.json({ status: "success", message: "Bitcoin order saved" });
  } catch (error) {
    console.error("Bitcoin order error:", error.message);
    res.status(500).json({ message: "Error saving Bitcoin order", error: error.message });
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

app.get("/api/order_history", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({ userId });
    res.json(orders);
  } catch (err) {
    console.error("Order history error:", err);
    res.status(500).json({ error: "Failed to fetch order history" });
  }
});

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
