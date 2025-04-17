const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    productId: { type: String, required: true }, // String since products array uses string IDs
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 }
});

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    items: [itemSchema],
    total: { type: Number, default: 0 }
});

module.exports = mongoose.model("cart", cartSchema);
