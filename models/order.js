const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fullName: String,
  phone: String,
  address: String,
  city: String,
  country: String,
  items: [
    {
      name: String,
      image: String,
      price: Number,
      quantity: Number
    }
  ],
  total: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Order || mongoose.model("Order", orderSchema);
