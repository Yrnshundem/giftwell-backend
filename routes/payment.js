const express = require("express");
const router = express.Router();
const order = require("../models/order");

router.post("/create-order", async (req, res) => {
  const { fullName, phone, address, city, country, items, total, isGuest, userId } = req.body;

  // Validate required fields
  if (!fullName || !phone || !address || !city || !country || !items || !Array.isArray(items) || total == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate items
  for (const item of items) {
    if (!item.productId || !item.name || item.price == null || !item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return res.status(400).json({ error: "Invalid item data" });
    }
  }

  try {
    const newOrder = new order({
      userId: isGuest ? "guest" : userId,
      fullName,
      phone,
      address,
      city,
      country,
      items,
      total,
      status: "pending",
      paymentMethod: "Bitcoin",
    });

    await newOrder.save();
    res.status(200).json({ message: "Order created. Please complete payment manually." });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ error: "Failed to create order." });
  }
});

module.exports = router;
