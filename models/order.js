const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: false }, // String to support "guest"
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  items: { type: [itemSchema], required: true },
  total: { type: Number, required: true },
  status: { type: String, default: "pending" },
  paymentMethod: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Prevent OverwriteModelError
module.exports = mongoose.models.order || mongoose.model("order", orderSchema);
