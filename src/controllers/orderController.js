// controllers/orderController.js
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const { calculateShippingFee, getRegionFromCountry } = require("../utils/shippingCalculator");
const stripePkg = require("stripe");
const VAT_RATE = parseFloat(process.env.VAT_RATE || 0.05);

const stripe = process.env.STRIPE_SECRET_KEY ? stripePkg(process.env.STRIPE_SECRET_KEY) : null;

/**
 * POST /api/orders
 * Body expected:
 * {
 *   userId?, // optional if you use auth middleware
 *   items: [{ productId, name, price, quantity, size, color, sku }],
 *   shippingAddress: { country, state, city, street, ... },
 *   billingAddress?,
 *   paymentMethod: 'stripe' | 'cash',
 *   createPaymentIntent: boolean  // optional
 * }
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    items,
    shippingAddress,
    billingAddress,
    paymentMethod = "stripe",
    createPaymentIntent = false,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart items are required" });
  }
  if (!shippingAddress || !shippingAddress.country) {
    return res.status(400).json({ message: "Shipping address with country is required" });
  }

  // Calculate subtotal (digit-by-digit safe)
  let subtotal = 0;
  for (const it of items) {
    const price = Number(it.price) || 0;
    const qty = Number(it.quantity) || 0;
    // multiply carefully:
    const line = price * qty;
    subtotal = subtotal + line;
  }

  // VAT
  const vat = subtotal * VAT_RATE;

  // Shipping
  const { shippingFee, region } = calculateShippingFee({
    country: shippingAddress.country,
    subtotal,
  });

  // Total
  const total = subtotal + vat + shippingFee;

  // Build order
  const orderData = {
    userId: (req.user && req.user.id) || req.body.userId || null,
    items,
    subtotal,
    vat,
    shippingFee,
    total,
    region,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    paymentMethod,
    paymentStatus: paymentMethod === "cash" ? "pending" : "pending",
  };

  // Optionally create Stripe PaymentIntent if using Stripe
  if (paymentMethod === "stripe" && createPaymentIntent && stripe) {
    try {
      // Note: Stripe expects amount in the smallest currency unit (e.g., fils)
      const amountInFils = Math.round(total * 100); // AED -> fils
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInFils,
        currency: "aed",
        // optionally: metadata, receipt_email, description
        metadata: {
          integration_check: "tyem",
        },
      });

      orderData.stripePaymentIntentId = paymentIntent.id;
      // Do not mark paid until webhook or client confirms
    } catch (err) {
      console.error("Stripe error:", err);
      return res.status(500).json({ message: "Failed to create payment intent" });
    }
  }

  const order = await Order.create(orderData);
  return res.status(201).json({ success: true, order });
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id).lean();
  if (!order) return res.status(404).json({ message: "Order not found" });
  return res.json({ order });
});

// List orders for a user (if using auth)
const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  if (!userId) return res.status(400).json({ message: "User not provided" });
  const orders = await Order.find({ userId }).sort({ createdAt: -1 });
  return res.json({ orders });
});

module.exports = { createOrder, getOrderById, getMyOrders };
