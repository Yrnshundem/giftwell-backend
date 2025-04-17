const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const authenticate = require("../middleware/authenticate");

router.post("/add", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, name, price, image, quantity = 1 } = req.body;

        if (!productId || !name || !price || !image) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        let cart = await Cart.findOne({ userId }) || new Cart({ userId, items: [], total: 0 });
        const existingItem = cart.items.find(item => item.productId === productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ productId, name, price, image, quantity });
        }

        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();
        res.json({ message: "Item added", cart });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get("/", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });
        res.json({ items: cart?.items || [], total: cart?.total || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put("/update", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ error: "Cart not found" });

        const item = cart.items.find(item => item.productId === productId);
        if (!item) return res.status(404).json({ error: "Item not found" });

        item.quantity = Math.max(1, quantity);
        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();

        res.json({ message: "Quantity updated", cart });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/remove/:productId", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ error: "Cart not found" });

        cart.items = cart.items.filter(item => item.productId !== productId);
        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();

        res.json({ message: "Item removed", cart });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/merge", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body;

        let cart = await Cart.findOne({ userId }) || new Cart({ userId, items: [], total: 0 });
        for (const guestItem of items) {
            const existingItem = cart.items.find(item => item.productId === guestItem.productId);
            if (existingItem) {
                existingItem.quantity += guestItem.quantity || 1;
            } else {
                cart.items.push({
                    productId: guestItem.productId,
                    name: guestItem.name,
                    price: guestItem.price,
                    image: guestItem.image,
                    quantity: guestItem.quantity || 1
                });
            }
        }

        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();
        res.json({ message: "Guest cart merged", cart });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/clear", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await Cart.deleteOne({ userId });
        res.json({ message: "Cart cleared" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
