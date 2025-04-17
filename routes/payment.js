const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const order = require("../models/order");

router.post("/create-order", async (req, res) => {
    const { fullName, phone, address, city, country, items, total, isGuest } = req.body;

    // Validate required fields
    if (!fullName || !phone || !address || !city || !country || !items || !total) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const newOrder = new order({
            userId: isGuest ? "guest" : req.user?.id,
            fullName,
            phone,
            address,
            city,
            country,
            items,
            total,
            status: "pending",
            paymentMethod: "Bitcoin"
        });

        await newOrder.save();
        res.status(200).json({ message: "Order created. Please complete payment manually." });
    } catch (err) {
        console.error("Order creation failed:", err);
        res.status(500).json({ error: "Failed to create order." });
    }
});

module.exports = router;
