// routes/coinbase.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config(); // Make sure you have your .env file with API keys

const COINBASE_API_KEY = process.env.COINBASE_API_KEY;
const COINBASE_API_URL = 'https://api.commerce.coinbase.com/charges';

router.post('/create-charge', async (req, res) => {
  try {
    const { name, description, price } = req.body;

    const chargeData = {
      name,
      description,
      pricing_type: 'fixed_price',
      local_price: {
        amount: price,
        currency: 'USD'
      },
      metadata: {
        customer_id: 'giftwell-user',
        customer_name: name
      },
      redirect_url: 'http://localhost:5500/thankyou.html',
      cancel_url: 'http://localhost:5500/payment.html'
    };

    const response = await axios.post(COINBASE_API_URL, chargeData, {
      headers: {
        'X-CC-Api-Key': COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json({ hosted_url: response.data.data.hosted_url });
  } catch (error) {
    console.error("Coinbase error:", error.response?.data || error.message);
    res.status(500).json({ message: 'An error occurred while creating the charge.' });
  }
});

module.exports = router;
