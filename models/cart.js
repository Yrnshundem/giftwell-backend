// models/cart.js

const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  quantity: { type: Number, default: 1 }
});

const cartSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  items: [itemSchema]
});

module.exports = mongoose.model("cart", cartSchema);
