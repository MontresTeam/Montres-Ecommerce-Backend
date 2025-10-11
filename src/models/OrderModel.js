// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false },
  name: { type: String },
  price: { type: Number, required: true }, // already includes VAT if applicable
  quantity: { type: Number, required: true },
}, { _id: false });

const addressSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  phone: String,
  email: String,
  country: String,
  state: String,
  city: String,
  street: String,
  postalCode: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true, default: 0 }, // sum of item prices
  vat: { type: Number, required: true, default: 0 }, // 0 if prices include VAT
  shippingFee: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 0 }, // subtotal + shippingFee
  currency: { type: String, default: "AED" },
  region: { type: String, enum: ["local", "gcc", "worldwide"], default: "local" },
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  paymentMethod: { type: String, default: "stripe" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  stripePaymentIntentId: { type: String },
  orderStatus: { type: String, default: "Pending" },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
