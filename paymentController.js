const express = require('express');
const router = express.Router();
const { Client, resources } = require('coinbase-commerce-node');
const { Charge } = resources;

Client.init('b605046d-ad20-4834-9dfe-27dde1a9136b'); // your API key

router.post('/create-charge', async (req, res) => {
    const { name, description, amount } = req.body;

    try {
        const charge = await Charge.create({
            name: name || 'GiftWell Order',
            description: description || 'GiftWell BTC Payment',
            local_price: {
                amount: amount,
                currency: 'USD' // You can change this to GHS, but BTC equivalent will be used
            },
            pricing_type: 'fixed_price',
            redirect_url: 'http://localhost:5500/payment-success.html',
            cancel_url: 'http://localhost:5500/payment-cancel.html'
        });

        res.json({ hosted_url: charge.hosted_url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create charge' });
    }
});

module.exports = router;
