// routes/order.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate'); // ✅ correct

const Order = require('../models/order'); // Corrected import path to Order model

router.post('/', authenticate, async (req, res) => {
    try {
        const { fullName, phone, address, city, country, items, total } = req.body;

        const newOrder = new Order({
            userId: req.user.id, // from your jwt
            fullName,
            phone,
            address,
            city,
            country,
            items,
            total
        });

        await newOrder.save();
        res.status(201).json({ message: "Order confirmed successfully" });
    } catch (err) {
        console.error("Order error:", err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

module.exports = router;
