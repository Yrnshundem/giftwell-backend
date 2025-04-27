const express = require("express");
const router = express.Router();
const Cart = require("../models/cart");
const authenticate = require("../middleware/authenticate");

router.get("/", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    res.json(cart || { items: [], total: 0 });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart", error });
  }
});

router.post("/add", authenticate, async (req, res) => {
  try {
    const { productId, name, price, quantity, image } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [], total: 0 });
    }
    const existingItem = cart.items.find(item => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity || 1;
    } else {
      cart.items.push({ productId, name, price, quantity: quantity || 1, image });
    }
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();
    res.json({ message: "Item added", cart });
  } catch (error) {
    res.status(500).json({ message: "Error adding item", error });
  }
});

router.delete("/remove/:productId", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }
    cart.items = cart.items.filter(item => item.productId !== req.params.productId);
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();
    res.json({ message: "Item removed", cart });
  } catch (error) {
    res.status(500).json({ message: "Error removing item", error });
  }
});

router.delete("/clear", authenticate, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (cart) {
      cart.items = [];
      cart.total = 0;
      await cart.save();
    }
    res.json({ message: "Cart cleared" });
  } catch (error) {
    res.status(500).json({ message: "Error clearing cart", error });
  }
});

router.post("/merge", authenticate, async (req, res) => {
  try {
    const { items } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = new Cart({ userId: req.user.id, items: [], total: 0 });
    }
    items.forEach(newItem => {
      const existingItem = cart.items.find(item => item.productId === newItem.productId);
      if (existingItem) {
        existingItem.quantity += newItem.quantity || 1;
      } else {
        cart.items.push({
          productId: newItem.productId,
          name: newItem.name,
          price: newItem.price,
          quantity: newItem.quantity || 1,
          image: newItem.image
        });
      }
    });
    cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    await cart.save();
    res.json({ message: "Cart merged", cart });
  } catch (error) {
    res.status(500).json({ message: "Error merging cart", error });
  }
});

module.exports = router;
