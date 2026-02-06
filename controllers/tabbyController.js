require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const Order = require("../models/OrderModel");
const userModel = require('../models/UserModel')
const Product = require("../models/product");
const { calculateShippingFee } = require("../utils/shippingCalculator");

// ✅ Helper to get Tabby history
const getTabbyHistory = async (userId) => {
  let buyerHistory = {
    registered_since: new Date().toISOString(),
    loyalty_level: 0,
    wishlist_count: 0,
    is_social_networks_connected: false,
    is_phone_number_verified: true,
    is_email_verified: true
  };

  let orderHistory = [];

  if (userId && /^[0-9a-fA-F]{24}$/.test(userId)) {
    const user = await userModel.findById(userId);
    if (user) {
      buyerHistory = {
        registered_since: user.createdAt.toISOString(),
        loyalty_level: 0,
        wishlist_count: user.wishlistGroups?.reduce((acc, g) => acc + (g.items?.length || 0), 0) || 0,
        is_social_networks_connected: !!user.googleId,
        is_phone_number_verified: true,
        is_email_verified: true
      };
    }

    const pastOrders = await Order.find({ userId: userId, paymentStatus: 'paid' })
      .limit(10)
      .sort({ createdAt: -1 });

    orderHistory = pastOrders.map(o => ({
      purchased_at: o.createdAt.toISOString(),
      amount: String(o.total.toFixed(2)),
      currency: o.currency || "AED",
      status: o.paymentStatus === 'paid' ? 'captured' : (o.paymentStatus || 'new'),
      payment_method: o.paymentMethod === 'stripe' ? 'card' : 'other'
    }));
  }

  return { buyerHistory, orderHistory };
};

// ✅ Helper to format phone to E.164 (Required by Tabby)
const formatPhone = (p) => {
  if (!p) return undefined;
  let cleaned = p.replace(/\D/g, "");
  if (cleaned.startsWith("971")) return "+" + cleaned;
  if (cleaned.startsWith("05")) return "+971" + cleaned.substring(1);
  if (cleaned.length === 9 && cleaned.startsWith("5")) return "+971" + cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.substring(2);
  return "+" + cleaned;
};

// ✅ 1. Pre-Scoring
const preScoring = async (req, res) => {
  try {
    let { amount, currency, buyer, shipping_address } = req.body;

    if (req.body.payment) {
      amount = amount || req.body.payment.amount;
      currency = currency || req.body.payment.currency;
      buyer = buyer || req.body.payment.buyer;
      shipping_address = shipping_address || req.body.payment.shipping_address;
    } else if (req.body.customer) {
      buyer = buyer || req.body.customer.buyer;
      shipping_address = shipping_address || req.body.customer.shipping;
    }

    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        message: "Amount and currency are required for eligibility check",
      });
    }

    const userId = req.user?.userId;
    const { buyerHistory, orderHistory } = await getTabbyHistory(userId);

    const tabbyPayload = {
      payment: {
        amount: Number(Number(amount).toFixed(2)),
        currency: currency,
        buyer: {
          email: buyer?.email,
          name: buyer?.name,
          phone: formatPhone(buyer?.phone),
          id: userId || "guest_" + Date.now(),
        },
        shipping_address: shipping_address || {
          city: "Dubai",
          address: "N/A",
          zip: "00000"
        },
        buyer_history: buyerHistory,
        order_history: orderHistory,
      },
      merchant_code: process.env.TABBY_MERCHANT_CODE || "MOWA",
    };

    console.log("Tabby Pre-Scoring Payload:", JSON.stringify(tabbyPayload, null, 2));

    const response = await axios.post(
      "https://api.tabby.ai/api/v2/pre-scoring",
      tabbyPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      eligible: response.data.status === "approved" || response.data.status === "approved_with_changes",
      status: response.data.status,
      details: response.data,
    });
  } catch (error) {
    console.error("Tabby pre-scoring error:", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Eligibility check failed",
      error: error.response?.data || error.message,
      eligible: false,
    });
  }
};

// ✅ 2. Create Tabby Checkout Order
const createTabbyOrder = async (req, res) => {
  try {
    let { items, shippingAddress, billingAddress, customer, order: frontendOrder, successUrl: frontendSuccessUrl, cancelUrl: frontendCancelUrl, failureUrl: frontendFailureUrl, dummy = false } = req.body || {};

    if (!items && frontendOrder?.items) items = frontendOrder.items;
    if (!shippingAddress && customer?.shipping) shippingAddress = customer.shipping;
    if (!billingAddress) billingAddress = shippingAddress;

    const buyerInfo = customer?.buyer || frontendOrder?.buyer || {};
    const buyerEmail = buyerInfo.email || shippingAddress?.email || "otp.success@tabby.ai";
    const buyerPhone = buyerInfo.phone || shippingAddress?.phone || "+971500000001";
    const buyerName = buyerInfo.name || `${shippingAddress?.firstName || "Test"} ${shippingAddress?.lastName || "User"}`;

    let populatedItems = [];
    if (!dummy && Array.isArray(items) && items.length > 0) {
      populatedItems = await Promise.all(
        items.map(async (it) => {
          const productId = it.productId || it.reference_id || it.id;
          const product = await Product.findById(productId)
            .select("name images salePrice sku referenceNumber")
            .lean();

          if (!product) {
            return {
              productId: productId || null,
              name: it.name || it.title || "Product",
              image: it.image || "",
              price: Number(it.price || it.unit_price || 0),
              quantity: Number(it.quantity || 1),
              sku: it.sku || it.reference_id || "N/A"
            };
          }

          return {
            productId: product._id,
            name: product.name,
            image: product.images?.[0]?.url || product.images?.[0] || "",
            price: product.salePrice || 0,
            quantity: it.quantity || 1,
            sku: product.sku || product.referenceNumber || product._id.toString()
          };
        })
      );
    } else {
      populatedItems = [{ productId: null, name: "Dummy Watch", image: "", price: 100, quantity: 1, sku: "DUMMY-001" }];
    }

    const subtotal = populatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const { shippingFee, region } = calculateShippingFee({ country: shippingAddress?.country || "AE", subtotal });
    const total = subtotal + shippingFee;

    const order = await Order.create({
      userId: req.user?.userId,
      items: populatedItems,
      subtotal,
      vat: 0,
      shippingFee,
      total,
      region,
      shippingAddress,
      billingAddress,
      paymentMethod: "tabby",
      paymentStatus: "pending",
      currency: "AED",
    });

    const clientUrl = process.env.CLIENT_URL || "https://www.montres.ae";
    const successUrl = frontendSuccessUrl || `${clientUrl}/checkout/success?orderId=${order._id}`;
    const cancelUrl = frontendCancelUrl || `${clientUrl}/checkout?canceled=true&orderId=${order._id}`;
    const failureUrl = frontendFailureUrl || `${clientUrl}/checkout?failed=true&orderId=${order._id}`;

    const { buyerHistory, orderHistory } = await getTabbyHistory(req.user?.userId);

    const tabbyItems = populatedItems.map((item) => ({
      title: item.name,
      description: item.name,
      quantity: item.quantity,
      unit_price: String(item.price.toFixed(2)),
      category: "Watch",
      image_url: item.image || "",
      product_url: `${clientUrl}/product/${item.productId}`,
      brand: "Montres",
      reference_id: item.sku || item.productId?.toString() || "N/A",
      is_refundable: true
    }));

    const tabbyPayload = {
      payment: {
        amount: String(total.toFixed(2)),
        currency: "AED",
        description: `Order #${order._id}`,
        buyer: {
          id: req.user?.userId || order._id.toString(),
          email: buyerEmail,
          name: buyerName,
          phone: formatPhone(buyerPhone),
        },
        buyer_history: buyerHistory,
        shipping_address: {
          city: shippingAddress?.city || "Dubai",
          address: shippingAddress?.address1 || shippingAddress?.address || "Downtown",
          zip: shippingAddress?.postalCode || shippingAddress?.zip || "00000",
        },
        order: {
          reference_id: order._id.toString(),
          items: tabbyItems,
          shipping_amount: String(shippingFee.toFixed(2)),
          tax_amount: "0.00"
        },
        order_history: orderHistory,
      },
      merchant_code: req.body.merchant_code || process.env.TABBY_MERCHANT_CODE || "MTAE",
      lang: req.body.lang || req.body.language || "en",
      merchant_urls: { success: successUrl, cancel: cancelUrl, failure: failureUrl },
    };

    // --------------------------------------------------
    // ✅ Call Tabby API
    // --------------------------------------------------
    console.log("🟠 Sending Tabby Payload:", JSON.stringify(tabbyPayload, null, 2));

    const response = await axios.post("https://api.tabby.ai/api/v2/checkout", tabbyPayload, {
      headers: {
        Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
    });

    console.log("🔵 Tabby Response:", JSON.stringify(response.data, null, 2));

    const paymentUrl = response.data?.checkout_url || response.data?.web_url || response.data?.configuration?.available_products?.installments?.[0]?.web_url || null;

    if (!paymentUrl) {
      console.log("❌ Tabby checkout_url not found in response");
      return res.status(400).json({ success: false, message: "Tabby checkout unavailable", debug: response.data });
    }

    order.tabbySessionId = response.data.id || null;
    await order.save();

    return res.status(201).json({ success: true, order, checkoutUrl: paymentUrl });
  } catch (error) {
    console.error("❌ Tabby error details:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Tabby initialization failed",
      error: error.response?.data || error.message
    });
  }
};

// ✅ Webhook Handler
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"] || req.headers["x-tabby-signature"];
    let payload = req.body;
    if (Buffer.isBuffer(req.body)) payload = JSON.parse(req.body.toString("utf8"));

    const payment = payload.payment || payload;
    const paymentId = payment.id || payload.id;
    const referenceId = payment.order?.reference_id || payment.reference_id || payload.reference_id;
    const status = (payment.status || payload.status)?.toLowerCase();

    res.sendStatus(200);

    let order = await Order.findById(referenceId);
    if (!order) order = await Order.findOne({ orderId: referenceId });
    if (!order) return;

    if (status === "authorized") {
      // Logic for capture...
    } else if (status === "captured") {
      order.paymentStatus = "paid";
      order.orderStatus = "Processing";
      await order.save();
      await userModel.findByIdAndUpdate(order.userId, { $set: { cart: [] } });
    }
  } catch (error) {
    console.log("❌ Webhook error:", error.message);
  }
};

module.exports = {
  preScoring,
  createTabbyOrder,
  handleWebhook,
};
