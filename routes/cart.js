const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const authenticate = require("../middleware/authenticate");

router.post("/add", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, name, price, image, quantity = 1 } = req.body;

        // Validate required fields
        if (!productId || !name || price == null || !quantity) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (typeof price !== "number" || price <= 0) {
            return res.status(400).json({ message: "Invalid price" });
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: "Invalid quantity" });
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
        res.json({ message: "Item added to cart", cart });
    } catch (err) {
        console.error("Add to cart error:", err);
        res.status(500).json({ message: "Failed to add to cart" });
    }
});

router.get("/", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ userId });
        res.json({ items: cart?.items || [], total: cart?.total || 0 });
    } catch (err) {
        console.error("Get cart error:", err);
        res.status(500).json({ message: "Failed to fetch cart" });
    }
});

router.put("/update", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;

        if (!productId || !Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: "Invalid productId or quantity" });
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const item = cart.items.find(item => item.productId === productId);
        if (!item) return res.status(404).json({ message: "Item not found in cart" });

        item.quantity = quantity;
        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();

        res.json({ message: "Quantity updated", cart });
    } catch (err) {
        console.error("Update cart error:", err);
        res.status(500).json({ message: "Failed to update cart" });
    }
});

router.delete("/remove/:productId", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        let cart = await Cart.findOne({ userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        cart.items = cart.items.filter(item => item.productId !== productId);
        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();

        res.json({ message: "Item removed from cart", cart });
    } catch (err) {
        console.error("Remove from cart error:", err);
        res.status(500).json({ message: "Failed to remove item from cart" });
    }
});

router.post("/merge", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: "Invalid items array" });
        }

        let cart = await Cart.findOne({ userId }) || new Cart({ userId, items: [], total: 0 });
        for (const guestItem of items) {
            if (!guestItem.productId || !guestItem.name || guestItem.price == null || !guestItem.quantity) {
                continue; // Skip invalid items
            }
            const existingItem = cart.items.find(item => item.productId === guestItem.productId);
            if (existingItem) {
                existingItem.quantity += guestItem.quantity || 1;
            } else {
                cart.items.push({
                    productId: guestItem.productId,
                    name: guestItem.name,
                    price: guestItem.price,
                    image: guestItem.image, // Optional
                    quantity: guestItem.quantity || 1
                });
            }
        }

        cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await cart.save();
        res.json({ message: "Guest cart merged", cart });
    } catch (err) {
        console.error("Merge cart error:", err);
        res.status(500).json({ message: "Failed to merge cart" });
    }
});

router.delete("/clear", authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        await Cart.deleteOne({ userId });
        res.json({ message: "Cart cleared" });
    } catch (err) {
        console.error("Clear cart error:", err);
        res.status(500).json({ message: "Failed to clear cart" });
    }
});

module.exports = router;
