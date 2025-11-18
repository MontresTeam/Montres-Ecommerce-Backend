// models/RestockSubscription.js
const mongoose = require("mongoose");

const restockSubscriptionSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  email: { type: String, required: true },
  isNotified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("RestockSubscription", restockSubscriptionSchema);
