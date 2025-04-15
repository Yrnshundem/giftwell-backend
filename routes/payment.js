const express = require("express");
const router = express.Router();
const CoinbaseCommerce = require("coinbase-commerce-node");
const authenticate = require("../middleware/authenticate");
const Order = require("../models/Order");

const { Client, resources } = CoinbaseCommerce;
const { Charge } = resources;

// Init with your API key
Client.init(process.env.COINBASE_API_KEY); // Add COINBASE_API_KEY to .env

router.post("/create-charge", authenticate, async (req, res) => {
  const { fullName, phone, address, city, country, items, total } = req.body;

  try {
    const chargeData = {
      name: "GiftWell Order",
      description: `${items.length} item(s) for ${fullName}`,
      local_price: {
        amount: total,
        currency: "USD"
      },
      pricing_type: "fixed_price",
      metadata: {
        userId: req.user.id,
        fullName,
        phone,
        address,
        city,
        country,
        items: JSON.stringify(items)
      },
      redirect_url: "https://yourdomain.com/thankyou.html",  // Change to your actual domain
      cancel_url: "https://yourdomain.com/checkout.html"
    };

    const charge = await Charge.create(chargeData);
    res.json({ hosted_url: charge.hosted_url });
  } catch (err) {
    console.error("Coinbase error:", err);
    res.status(500).json({ message: "Failed to create payment" });
  }
});

module.exports = router;
