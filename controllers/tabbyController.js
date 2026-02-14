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

const mongoose = require("mongoose");
const sendOrderConfirmation = require("../utils/sendOrderConfirmation");

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
      merchant_code: process.env.TABBY_MERCHANT_CODE || "MTAE",
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

// ✅ 2. Create Tabby Checkout Order (Session only)
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
        items.map(async (it) => { // Use 'it' as the iterator variable
          const productId = it.productId || it.reference_id || it.id;
          const product = await Product.findById(productId)
            .select("name images salePrice sku referenceNumber")
            .lean();

          if (!product) {
            return {
              productId: productId && mongoose.Types.ObjectId.isValid(productId) ? productId : null,
              name: it.name || it.title || "Product", // Use 'it' here
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
      populatedItems = [{ productId: null, name: "Dummy Watch", image: "https://www.montres.ae/logo.png", price: 100, quantity: 1, sku: "DUMMY-001" }];
    }

    const subtotal = populatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const { shippingFee, region } = calculateShippingFee({ country: shippingAddress?.country || "AE", subtotal });
    const total = Number((subtotal + shippingFee).toFixed(2));

    // Generate a reference ID for tracking before order creation
    const referenceId = `tabby_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const clientUrl = process.env.CLIENT_URL || "https://www.montres.ae";
    // NOTE: successUrl uses referenceId as orderId for the frontend until the order is actually created
    const successUrl = frontendSuccessUrl
      ? `${frontendSuccessUrl}${frontendSuccessUrl.includes('?') ? '&' : '?'}orderId=${referenceId}&payment=tabby`
      : `${clientUrl}/checkout/success?orderId=${referenceId}&payment=tabby`;
    const cancelUrl = frontendCancelUrl
      ? `${frontendCancelUrl}${frontendCancelUrl.includes('?') ? '&' : '?'}orderId=${referenceId}&payment=tabby`
      : `${clientUrl}/checkout/cancel?orderId=${referenceId}&payment=tabby`;
    const failureUrl = frontendFailureUrl
      ? `${frontendFailureUrl}${frontendFailureUrl.includes('?') ? '&' : '?'}orderId=${referenceId}&payment=tabby`
      : `${clientUrl}/checkout/failure?orderId=${referenceId}&payment=tabby`;

    const { buyerHistory, orderHistory } = await getTabbyHistory(req.user?.userId);

    const tabbyItems = populatedItems.map((item) => ({
      title: item.name,
      description: item.name,
      quantity: item.quantity,
      unit_price: String(item.price.toFixed(2)), // ✅ Fixed: Must be String
      category: "Watch",
      image_url: item.image || "https://www.montres.ae/logo.png",
      product_url: item.productId ? `${clientUrl}/product/${item.productId}` : clientUrl,
      brand: "Montres",
      reference_id: item.productId?.toString() || item.sku || "N/A",
      is_refundable: true
    }));

    // ✅ FIXED PAYLOAD STRUCTURE - STRICT TYPES
    const tabbyPayload = {
      payment: {
        amount: String(total), // ✅ Fixed: Must be String
        currency: "AED",
        description: `Order via Tabby`,
        buyer: {
          id: req.user?.userId || "guest_" + Date.now(),
          name: buyerName,
          email: buyerEmail,
          phone: formatPhone(buyerPhone),
        },
        shipping_address: {
          city: shippingAddress?.city || "Dubai",
          address: shippingAddress?.address1 || shippingAddress?.address || "Downtown",
          zip: shippingAddress?.postalCode || shippingAddress?.zip || "00000",
        },
        order: {
          reference_id: referenceId,
          items: tabbyItems,
          shipping_amount: String(shippingFee.toFixed(2)), // ✅ Fixed: Must be String
          tax_amount: "0" // ✅ Fixed: Must be String
        },
        buyer_history: buyerHistory,
        order_history: orderHistory,
      },
      merchant_code: req.body.merchant_code || process.env.TABBY_MERCHANT_CODE || "MTAE",
      lang: req.body.lang || req.body.language || "en",
      merchant_urls: {
        success: successUrl,
        cancel: cancelUrl,
        failure: failureUrl
      },
    };

    console.log("🟠 Sending Tabby Payload:", JSON.stringify(tabbyPayload, null, 2));

    const response = await axios.post("https://api.tabby.ai/api/v2/checkout", tabbyPayload, {
      headers: {
        Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
    });

    const paymentUrl = response.data?.checkout_url || response.data?.web_url || response.data?.configuration?.available_products?.installments?.[0]?.web_url || null;
    const tabbyPaymentId = response.data?.id || response.data?.payment?.id;

    if (!paymentUrl) {
      return res.status(400).json({
        success: false,
        message: response.data.status === "rejected" ? "Tabby has rejected this order" : "Tabby checkout unavailable",
        status: response.data.status,
        debug: response.data
      });
    }

    // ✅ Create the order in "pending" status before redirecting
    try {
      await Order.create({
        userId: req.user?.userId,
        orderId: referenceId,
        tabbySessionId: tabbyPaymentId,
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
          lastName: shippingAddress?.lastName || "",
          email: buyerEmail,
          phone: buyerPhone,
          city: shippingAddress?.city || "Dubai",
          street: shippingAddress?.address1 || shippingAddress?.address || "Downtown",
          postalCode: shippingAddress?.postalCode || shippingAddress?.zip || "00000"
        },
        billingAddress: {
          firstName: billingAddress?.firstName || shippingAddress?.firstName || "Customer",
          lastName: billingAddress?.lastName || shippingAddress?.lastName || "",
          email: buyerEmail,
          phone: buyerPhone,
          city: billingAddress?.city || shippingAddress?.city || "Dubai",
          street: billingAddress?.address1 || shippingAddress?.address1 || "Downtown",
          postalCode: billingAddress?.postalCode || shippingAddress?.postalCode || "00000"
        }
      });
      console.log(`📝 Order record created (Pending): ${referenceId} (Tabby ID: ${tabbyPaymentId})`);
    } catch (dbError) {
      console.error("⚠️ Failed to create pending order record:", dbError.message);
    }

    return res.status(201).json({ success: true, referenceId, checkoutUrl: paymentUrl });
  } catch (error) {
    console.error("❌ Tabby error details:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Tabby initialization failed",
      error: error.response?.data || error.message
    });
  }
};


// -----------------------------------------------------
// 🔐 VERIFY TABBY SIGNATURE
// -----------------------------------------------------
const verifyTabbySignature = (req) => {
  // Sandbox/Development → skip check if not production
  if (process.env.NODE_ENV !== "production") {
    console.log("⚠️ Tabby sandbox mode – skipping signature verification");
    return true;
  }

  const signature = req.headers["x-tabby-signature"] || req.headers["tabby-signature"];
  const secret = process.env.TABBY_WEBHOOK_SECRET;

  if (!signature) {
    console.error("❌ Tabby signature header missing");
    return false;
  }

  if (!secret) {
    console.warn("⚠️ TABBY_WEBHOOK_SECRET not set, allowing for now...");
    return true;
  }

  // Use raw body if available, otherwise req.body
  const body = req.rawBody || req.body;
  const payload = Buffer.isBuffer(body) ? body : JSON.stringify(body);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch {
    return expectedSignature === signature;
  }
};

// -----------------------------------------------------
// 🚀 HANDLE TABBY WEBHOOK
// -----------------------------------------------------
const handleWebhook = async (req, res) => {
  try {

    // �️ 1. Verify Signature
    if (!verifyTabbySignature(req)) {
      console.error("❌ Invalid Tabby signature attempt");
      return res.status(401).json({ message: "Invalid signature" });
    }

    // ✅ 2. Immediately acknowledge
    res.status(200).send("ok");

    // 📦 3. Parse payload safely
    let payload = req.body;
    if (Buffer.isBuffer(req.body)) {
      try {
        payload = JSON.parse(req.body.toString("utf8"));
      } catch (err) {
        console.error("❌ Failed to parse webhook payload:", err.message);
        return;
      }
    }

    const payment = payload.payment || payload;
    const paymentId = payment.id;
    const referenceId = payment.order?.reference_id || payment.reference_id;
    const status = (payment.status || "").toLowerCase();

    if (!referenceId) {
      console.error("❌ Missing reference_id in webhook");
      return;
    }

    console.log(`🔔 Tabby Webhook | Ref: ${referenceId} | Status: ${status} | PaymentID: ${paymentId}`);

    // 4. Find Order
    const order = await Order.findOne({
      $or: [
        { orderId: referenceId },
        { tabbySessionId: paymentId }
      ]
    });

    if (!order) {
      console.error(`❌ Order not found in DB for reference: ${referenceId}`);
      return;
    }

    // -------------------------------------------------
    // 🟢 SUCCESS FLOW (Authorized -> Capture)
    // -------------------------------------------------

    if (status === "authorized") {
      console.log(`⚡ Payment ${paymentId} AUTHORIZED. Starting Verify & Capture...`);

      try {
        // A. Verify status with Tabby API
        const verifyResponse = await axios.get(`https://api.tabby.ai/api/v2/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}` }
        });

        if (verifyResponse.data.status === "AUTHORIZED") {
          const capAmount = verifyResponse.data.amount;

          // B. Capture the payment
          const captureResponse = await axios.post(
            `https://api.tabby.ai/api/v2/payments/${paymentId}/captures`,
            { amount: String(capAmount) },
            {
              headers: {
                Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
                "Content-Type": "application/json"
              }
            }
          );
    
          console.log("💳 Capture Success:", captureResponse.data.status);

          // C. Update Order
          if (order.paymentStatus !== "paid") {
            order.paymentStatus = "paid";
            order.orderStatus = "Processing";
            order.tabbySessionId = paymentId;
            await order.save();
       
            // Clear Cart
            if (order.userId) {
              await userModel.findByIdAndUpdate(order.userId, {
                $set: { cart: [] }
              });
            }
            
            // Send Confirmation
            await sendOrderConfirmation(order._id).catch(e =>
              console.error("📧 Email Error:", e.message)
            );

            console.log(`🎉 Order ${order.orderId} confirmed and marked PAID`);
          }
        }
      } catch (err) {
        console.error("❌ Tabby Capture/Verify Failed:", err.response?.data || err.message);
      }
    }

    // -------------------------------------------------
    // � CLOSED/CAPTURED (Handling redundant status updates)
    // -------------------------------------------------
    if (["captured", "closed"].includes(status) && order.paymentStatus !== "paid") {
      console.log(`✅ Order ${order.orderId} marked PAID (via ${status} status)`);

      order.paymentStatus = "paid";
      order.orderStatus = "Processing";
      order.tabbySessionId = paymentId;
      await order.save();

      if (order.userId) {
        await userModel.findByIdAndUpdate(order.userId, {
          $set: { cart: [] }
        });
      }

      await sendOrderConfirmation(order._id).catch(e =>
        console.error("📧 Email Error:", e.message)
      );
    }

    // -------------------------------------------------
    // 🔴 FAILURE FLOW
    // -------------------------------------------------
    if (["expired", "rejected", "failed", "cancelled", "canceled"].includes(status)) {
      if (order.paymentStatus === "pending") {
        console.log(`❌ Order ${order.orderId} FAILED/CANCELLED (Status: ${status})`);
        order.paymentStatus = "failed";
        order.orderStatus = "Cancelled";
        await order.save();
      }
    }

    // -------------------------------------------------
    // 🟠 REFUND FLOW
    // -------------------------------------------------
    if (["refunded", "partially_refunded"].includes(status.replace(" ", "_"))) {
      console.log(`↩️ Order ${order.orderId} REFUNDED (Status: ${status})`);
      order.paymentStatus = "refunded";
      await order.save();
    }

  } catch (error) {
    console.error("❌ Tabby Webhook Critical Error:", error.message);
  }
};


module.exports = {
  preScoring,
  createTabbyOrder,
  handleWebhook,
};
