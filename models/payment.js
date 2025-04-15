const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const order = require("../models/order");


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
 
});

module.exports = router;
