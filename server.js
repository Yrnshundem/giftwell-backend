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

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI || !process.env.SECRET_KEY || !process.env.PAYSTACK_SECRET_KEY) {
  console.error("Error: MONGO_URI, SECRET_KEY, and PAYSTACK_SECRET_KEY must be defined in .env");
  process.exit(1);
}

app.use(
  cors({
    origin: ["https://gift-well-frontend.vercel.app", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(bodyParser.json());

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
