require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/OrderModel");
const userModel = require('../models/UserModel')
const Product = require("../models/product");
const shippingCalculator = require("../utils/shippingCalculator");
const sendOrderConfirmation = require("../utils/sendOrderConfirmation");

// ----------------- Helpers -----------------

// Format phone to E.164
const formatPhone = (p) => {
  if (!p) return "+971500000001";
  let cleaned = p.replace(/\D/g, "");
  if (cleaned.startsWith("971")) return "+" + cleaned;
  if (cleaned.startsWith("05")) return "+971" + cleaned.substring(1);
  if (cleaned.length === 9 && cleaned.startsWith("5")) return "+971" + cleaned;
  if (cleaned.startsWith("00")) return "+" + cleaned.substring(2);
  return "+" + cleaned;
};

// Normalize country code
const normalizeCountry = (country) => {
  if (!country) return "AE";
  return country.length === 2 ? country.toUpperCase() : "AE";
};


// ----------------- Tabby Helpers -----------------

// Get buyer and order history for Tabby
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
    const user = await userModel.findById(userId).lean();
    if (user) {
      buyerHistory = {
        registered_since: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
        loyalty_level: 0,
        wishlist_count: user.wishlistGroups?.reduce((acc, g) => acc + (g.items?.length || 0), 0) || 0,
        is_social_networks_connected: !!user.googleId,
        is_phone_number_verified: true,
        is_email_verified: true
      };
    }

    const pastOrders = await Order.find({ userId: userId, paymentStatus: "paid" })
      .limit(10)
      .sort({ createdAt: -1 })
      .lean();

    orderHistory = pastOrders.map((o) => ({
      purchased_at: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      amount: parseFloat(o.total || 0).toFixed(2),
      currency: o.currency || "AED",
      status: "complete",
      payment_method:
        o.paymentMethod === "stripe"
          ? "card"
          : o.paymentMethod === "tabby"
            ? "installments"
            : "other",
      buyer: {
        id: o.userId?.toString() || "guest",
        email: o.shippingAddress?.email || user?.email || "noemail@test.com",
        name: `${o.shippingAddress?.firstName || ""} ${o.shippingAddress?.lastName || ""}`.trim() || user?.name || "Customer",
        phone: formatPhone(o.shippingAddress?.phone || user?.phone || "+971500000001")
      },
      shipping_address: {
        city: o.shippingAddress?.city || "Dubai",
        address: o.shippingAddress?.street || o.shippingAddress?.address || "N/A",
        zip: o.shippingAddress?.postalCode || "00000",
        country: normalizeCountry(o.shippingAddress?.country)
      }
    }));
  }

  return { buyerHistory, orderHistory };
};

// ----------------- Tabby Pre-Scoring -----------------

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
        amount: String(Number(amount).toFixed(2)),
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
          zip: "00000",
          country: "AE"
        },
        buyer_history: buyerHistory,
        order_history: orderHistory
      },
      merchant_code: process.env.TABBY_MERCHANT_CODE || "MTAE",
      lang: req.body.lang || "en"
    };

    console.log("Tabby Pre-Scoring Payload:", JSON.stringify(tabbyPayload, null, 2));

    let response;
    try {
      response = await axios.post("https://api.tabby.ai/api/v2/pre-scoring", tabbyPayload, {
        headers: {
          Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      });
    } catch (preError) {
      if (preError.response?.status === 404 || preError.response?.status === 405) {
        console.warn(`⚠️ Tabby pre-scoring endpoint returned ${preError.response?.status}. Falling back to checkout endpoint for eligibility.`);

        // Add dummy merchant_urls for checkout eligibility check
        const clientUrl = process.env.CLIENT_URL || "https://www.montres.ae";
        const fallbackPayload = {
          ...tabbyPayload,
          merchant_urls: {
            success: `${clientUrl}/checkout/success`,
            cancel: `${clientUrl}/checkout/cancel`,
            failure: `${clientUrl}/checkout/failure`
          }
        };

        response = await axios.post(
          "https://api.tabby.ai/api/v2/checkout",
          fallbackPayload,
          {
            headers: {
              Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
              "Content-Type": "application/json"
            },
            timeout: 10000
          }
        );
      } else {
        throw preError;
      }
    }

    const eligible = ["approved", "approved_with_changes", "created"].includes(response.data.status?.toLowerCase()) ||
      (response.data.configuration?.available_products?.installments?.length > 0);

    res.json({
      success: true,
      eligible: eligible,
      status: response.data.status,
      details: response.data
    });
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error("Tabby pre-scoring error:", JSON.stringify(errorData, null, 2));
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Eligibility check failed",
      error: errorData,
      eligible: false
    });
  }
};

// ----------------- Create Tabby Order -----------------

const createTabbyOrder = async (req, res) => {
  try {
    let {
      items,
      shippingAddress,
      billingAddress,
      customer,
      order: frontendOrder,
      successUrl: frontendSuccessUrl,
      cancelUrl: frontendCancelUrl,
      failureUrl: frontendFailureUrl,
      dummy = false
    } = req.body || {};

    if (!items && frontendOrder?.items) items = frontendOrder.items;
    if (!shippingAddress && customer?.shipping) shippingAddress = customer.shipping;
    if (!billingAddress) billingAddress = shippingAddress;

    const buyerInfo = customer?.buyer || frontendOrder?.buyer || {};
    const buyerEmail = buyerInfo.email || shippingAddress?.email || "otp.success@tabby.ai";
    const buyerPhone = buyerInfo.phone || shippingAddress?.phone || "+971500000001";
    const buyerName = buyerInfo.name || `${shippingAddress?.firstName || "Test"} ${shippingAddress?.lastName || "User"}`;

    // Populate items
    let populatedItems = [];
    if (!dummy && Array.isArray(items) && items.length > 0) {
      populatedItems = await Promise.all(items.map(async (it) => {
        const productId = it.productId || it.reference_id || it.id;
        const product = await Product.findById(productId).select("name images salePrice sku referenceNumber").lean();
        if (!product) {
          return {
            productId: productId && mongoose.Types.ObjectId.isValid(productId) ? productId : null,
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
      }));
    } else {
      populatedItems = [{
        productId: null,
        name: "Dummy Watch",
        image: "https://www.montres.ae/logo.png",
        price: 100,
        quantity: 1,
        sku: "DUMMY-001"
      }];
    }

    const subtotal = populatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const { shippingFee } = shippingCalculator.calculateShippingFee({ country: shippingAddress?.country || "AE", subtotal });
    const total = parseFloat((subtotal + shippingFee).toFixed(2));

    const referenceId = `tabby_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // ✅ NEW: Create order in database first
    const newOrder = await Order.create({
      userId: req.user?.userId || null,
      orderId: referenceId,
      items: populatedItems,
      subtotal: subtotal,
      shippingFee: shippingFee,
      total: total,
      paymentMethod: "tabby",
      paymentStatus: "pending",
      orderStatus: "Pending",
      currency: "AED",
      shippingAddress: {
        firstName: shippingAddress?.firstName || "Customer",
        lastName: shippingAddress?.lastName || "User",
        email: buyerEmail,
        phone: buyerPhone,
        city: shippingAddress?.city || "Dubai",
        street: shippingAddress?.address1 || shippingAddress?.street || "N/A",
        country: normalizeCountry(shippingAddress?.country),
        postalCode: shippingAddress?.postalCode || ""
      }
    });

    console.log(`📝 Pending Tabby order created: ${newOrder._id} (ID: ${referenceId})`);

    const clientUrl = process.env.CLIENT_URL || "https://www.montres.ae";

    const successUrl = frontendSuccessUrl
      ? `${frontendSuccessUrl}${frontendSuccessUrl.includes("?") ? "&" : "?"}orderId=${referenceId}`
      : `${clientUrl}/checkout/success?orderId=${referenceId}`;
    const cancelUrl = frontendCancelUrl
      ? `${frontendCancelUrl}${frontendCancelUrl.includes("?") ? "&" : "?"}orderId=${referenceId}`
      : `${clientUrl}/checkout?canceled=true&orderId=${referenceId}`;
    const failureUrl = frontendFailureUrl
      ? `${frontendFailureUrl}${frontendFailureUrl.includes("?") ? "&" : "?"}orderId=${referenceId}`
      : `${clientUrl}/checkout?failed=true&orderId=${referenceId}`;

    const { buyerHistory, orderHistory } = await getTabbyHistory(req.user?.userId);

    const tabbyItems = populatedItems.map((item) => ({
      title: item.name,
      description: item.name,
      quantity: item.quantity,
      unit_price: item.price.toFixed(2),
      category: "Watch",
      image_url: item.image || "https://www.montres.ae/logo.png",
      product_url: item.productId ? `${clientUrl}/product/${item.productId}` : clientUrl,
      brand: "Montres",
      reference_id: item.productId?.toString() || item.sku || "N/A",
      is_refundable: true
    }));

    const tabbyPayload = {
      payment: {
        amount: total.toFixed(2),
        currency: "AED",
        description: `Order via Tabby`,
        buyer: {
          id: req.user?.userId || "guest_" + Date.now(),
          email: buyerEmail,
          name: buyerName,
          phone: formatPhone(buyerPhone)
        },
        buyer_history: buyerHistory,
        shipping_address: {
          city: shippingAddress?.city || "Dubai",
          address: shippingAddress?.address1 || shippingAddress?.address || "Downtown",
          zip: shippingAddress?.postalCode || shippingAddress?.zip || "00000",
          country: normalizeCountry(shippingAddress?.country)
        },
        order: {
          reference_id: referenceId,
          items: tabbyItems,
          shipping_amount: shippingFee.toFixed(2),
          tax_amount: "0.00"
        },
        order_history: orderHistory
      },
      merchant_code: req.body.merchant_code || process.env.TABBY_MERCHANT_CODE || "MTAE",
      lang: req.body.lang || req.body.language || "en",
      merchant_urls: {
        success: successUrl,
        cancel: cancelUrl,
        failure: failureUrl
      }
    };

    console.log("🟠 Sending Tabby Payload:", JSON.stringify(tabbyPayload, null, 2));

    const response = await axios.post("https://api.tabby.ai/api/v2/checkout", tabbyPayload, {
      headers: {
        Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 10000
    });

    const paymentUrl =
      response.data?.checkout_url ||
      response.data?.web_url ||
      response.data?.configuration?.available_products?.installments?.[0]?.web_url ||
      null;

    if (!paymentUrl) {
      // Cleanup if failed
      await Order.findByIdAndDelete(newOrder._id);
      return res.status(400).json({
        success: false,
        message: response.data.status === "rejected" ? "Tabby has rejected this order" : "Tabby checkout unavailable",
        status: response.data.status,
        debug: response.data
      });
    }

    // Save session ID to order
    newOrder.tabbySessionId = response.data.id;
    await newOrder.save();

    return res.status(201).json({ success: true, referenceId, checkoutUrl: paymentUrl });

  } catch (error) {
    console.error("❌ Tabby error details:", JSON.stringify(error.response?.data || error.message, null, 2));
    return res.status(500).json({
      success: false,
      message: "Tabby initialization failed",
      error: error.response?.data || error.message
    });
  }
};



const TABBY_BASE = "https://api.tabby.ai/api/v2";

const handleTabbyWebhook = async (req, res) => {
  console.log("--------------------------------------------------");
  console.log("🔔 TABBY WEBHOOK HIT");

  try {
    /* =================================================
       1️⃣ ACK immediately (Tabby standard)
    ================================================= */
    res.status(200).send("ok");

    /* =================================================
       2️⃣ Parse payload & Validate Signature
    ================================================= */
    const signature = req.headers["x-tabby-signature"];
    const webhookSecret = process.env.TABBY_WEBHOOK_SECRET;

    // QA CHECKLIST: Webhook signature validation
    if (webhookSecret && signature !== webhookSecret) {
      console.warn("⚠️ Tabby Webhook: Invalid signature. Ignoring.");
      // We still return 200 because Tabby will keep retrying otherwise, 
      // but we don't process it. Or we could return 401. 
      // Most recommend 401 for invalid signatures.
      return;
    }

    let payload = req.body;
    if (Buffer.isBuffer(payload)) {
      payload = JSON.parse(payload.toString("utf8"));
    }

    const incoming = payload.payment || payload;
    const paymentId = incoming?.id;
    const referenceId = incoming?.order?.reference_id || incoming?.reference_id || payload.order?.reference_id;

    if (!paymentId) {
      console.error("❌ Tabby Webhook: Missing paymentId");
      return;
    }

    console.log(`📦 Tabby Payload - ID: ${paymentId}, Ref: ${referenceId}`);

    /* =================================================
       3️⃣ VERIFY payment with Tabby API (Source of Truth)
    ================================================= */
    const headers = {
      Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
      "Content-Type": "application/json",
    };

    const verifyRes = await axios.get(
      `${TABBY_BASE}/payments/${paymentId}`,
      { headers, timeout: 10000 }
    );

    const payment = verifyRes.data;
    const status = (payment.status || "").toLowerCase();
    const amount = Number(payment.amount || 0);

    console.log(`🔍 Tabby Verified State: ${status} for Ref: ${referenceId}`);

    /* =================================================
       4️⃣ Find order in DB & Validate
    ================================================= */
    let order = await Order.findOne({
      $or: [
        { orderId: referenceId },
        { tabbySessionId: paymentId },
      ],
    });

    if (!order) {
      console.log(`📝 Creating new order for Tabby Reference: ${referenceId}`);

      const rawItems = payment.order?.items || [];
      const reconstructedItems = rawItems.map(item => ({
        productId: mongoose.Types.ObjectId.isValid(item.reference_id) ? item.reference_id : null,
        name: item.title,
        price: Number(item.unit_price),
        quantity: Number(item.quantity),
        image: item.image_url || ""
      }));

      const shippingAmount = Number(payment.order?.shipping_amount || 0);
      const totalAmount = Number(payment.amount);
      const subtotalAmount = totalAmount - shippingAmount;

      const buyer = payment.buyer || {};
      const shipping = payment.shipping_address || {};
      const userId = (buyer.id && mongoose.Types.ObjectId.isValid(buyer.id)) ? buyer.id : null;

      order = await Order.create({
        userId: userId,
        orderId: referenceId,
        items: reconstructedItems,
        subtotal: subtotalAmount,
        shippingFee: shippingAmount,
        total: totalAmount,
        paymentMethod: "tabby",
        paymentStatus: "paid",
        orderStatus: "Processing",
        currency: payment.currency || "AED",
        tabbySessionId: paymentId,
        shippingAddress: {
          firstName: buyer.name?.split(" ")[0] || "Customer",
          lastName: buyer.name?.split(" ").slice(1).join(" ") || "User",
          email: buyer.email,
          phone: buyer.phone,
          city: shipping.city || "N/A",
          street: shipping.address || "N/A",
          country: shipping.country || (payment.currency === 'SAR' ? 'SA' : 'AE'),
          postalCode: shipping.zip || ""
        }
      });

      console.log(`✅ Order created successfully from webhook: ${order._id}`);
    }

    // QA CHECKLIST: Match amount with order
    if (Math.abs(amount - order.total) > 0.01) {
      console.error(`❌ Amount mismatch! Tabby: ${amount}, DB: ${order.total}`);
      return;
    }

    /* =================================================
       💳 AUTHORIZED → Update DB & Trigger Capture
    ================================================= */
    if (status === "authorized") {
      // QA CHECKLIST: Prevent duplicate capture
      if (order.paymentStatus === "authorized" || order.paymentStatus === "paid") {
        console.log(`ℹ️ Order ${referenceId} already authorized/paid. Skipping capture trigger.`);
        return;
      }

      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            paymentStatus: "authorized",
            tabbySessionId: paymentId
          }
        }
      );
      console.log(`📝 Order ${referenceId} updated to AUTHORIZED`);

      console.log("💳 Triggering capture...");
      try {
        const captureRes = await axios.post(
          `${TABBY_BASE}/payments/${paymentId}/captures`,
          { amount: String(amount.toFixed(2)) }, // Capture FULL amount
          { headers }
        );
        console.log("✅ Capture request sent successfully");

        // Save capture response info if needed
        await Order.updateOne(
          { _id: order._id },
          { $set: { tabbyCaptureId: captureRes.data.id } }
        );
      } catch (capErr) {
        console.error("❌ Capture request failed:", capErr.response?.data || capErr.message);
      }
      return;
    }

    /* =================================================
       ✅ CLOSED / CAPTURED → Mark PAID & Finalize
    ================================================= */
    if (status === "closed" || status === "captured") {
      if (order.paymentStatus === "paid") {
        console.log(`ℹ️ Order ${referenceId} already marked as PAID.`);
        return;
      }

      // Atomic update for idempotency
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: order._id, paymentStatus: { $ne: "paid" } },
        {
          $set: {
            paymentStatus: "paid",
            orderStatus: "Processing",
            tabbySessionId: paymentId
          }
        },
        { new: true }
      );

      if (updatedOrder) {
        // Clear User Cart
        if (updatedOrder.userId) {
          await userModel.findByIdAndUpdate(updatedOrder.userId, {
            $set: { cart: [] },
            $addToSet: { orders: updatedOrder._id }
          });
          console.log(`🛒 Cart cleared for user: ${updatedOrder.userId}`);
        }

        // Send Confirmation
        try {
          await sendOrderConfirmation(updatedOrder._id);
          console.log(`✅ Order ${referenceId} finalized and marked PAID`);
        } catch (mailErr) {
          console.error("📧 Failed to send confirmation email:", mailErr.message);
        }
      }
      return;
    }

    /* =================================================
       ❌ FAILED / EXPIRED / REJECTED
    ================================================= */
    if (["failed", "expired", "rejected", "canceled", "cancelled"].includes(status)) {
      if (order.paymentStatus !== "failed" && order.paymentStatus !== "paid") {
        const statusMap = {
          expired: "Expired",
          rejected: "Rejected",
          canceled: "Cancelled",
          cancelled: "Cancelled",
          failed: "Failed"
        };

        order.paymentStatus = "failed";
        order.orderStatus = statusMap[status] || "Cancelled";
        await order.save();
        console.log(`❌ Order ${referenceId} marked FAILED (Tabby status: ${status})`);
      }
      return;
    }

    /* =================================================
       💰 REFUNDED
    ================================================= */
    if (status === "refunded") {
      if (order.paymentStatus !== "refunded") {
        order.paymentStatus = "refunded";
        await order.save();
        console.log(`💰 Order ${referenceId} marked REFUNDED`);
      }
      return;
    }

  } catch (err) {
    console.error("❌ Tabby webhook processing error:", err.response?.data || err.message);
  } finally {
    console.log("--------------------------------------------------");
  }
};




module.exports = {
  preScoring,
  createTabbyOrder,
  handleTabbyWebhook,
};
