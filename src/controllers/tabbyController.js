require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const Order = require("../models/OrderModel"); // Adjust path to Order model if needed
const userModel = require('../models/UserModel')

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

    // Support wrapped payload if frontend sends it that way
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

    // Call Tabby pre-scoring API
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
    console.error(
      "Tabby pre-scoring error:",
      error.response?.data || error.message
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Eligibility check failed",
      error: error.response?.data || error.message,
      eligible: false,
    });
  }
};


// ✅ 2. Create Session
const createSession = async (req, res) => {
  try {
    const { payment, merchant_urls, merchant_code, lang } = req.body;
    const userId = req.user?.userId || req.body.userId; // Get from auth or body
    const clientUrl = process.env.CLIENT_URL || "https://www.montres.ae";

    if (!payment || !payment.order) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment data",
      });
    }

    // ✅ Map shipping address correctly for Order model
    const shippingAddress = {
      firstName: payment.buyer.name?.split(" ")[0] || "Guest",
      lastName: payment.buyer.name?.split(" ").slice(1).join(" ") || "User",
      email: payment.buyer.email,
      phone: payment.buyer.phone,
      city: payment.shipping_address?.city || "N/A",
      street: payment.shipping_address?.address || "N/A",
      country: "AE", // Default to AE for Tabby if not specified
    };

    // ✅ Create order in DB (Include required fields like subtotal and userId)
    // Generate a temporary userId if not authenticated, though usually this route should be protected
    const finalUserId = userId && /^[0-9a-fA-F]{24}$/.test(userId) ? userId : "000000000000000000000000";

    const order = await Order.create({
      userId: finalUserId,
      orderId: payment.order.reference_id,
      items: payment.order.items.map((item) => ({
        name: item.title,
        price: Number(item.unit_price),
        quantity: item.quantity,
      })),
      subtotal: Number(payment.amount), // Required by model
      total: Number(payment.amount),
      currency: payment.currency,
      paymentMethod: "tabby",
      paymentStatus: "pending",
      orderStatus: "Pending",
      shippingAddress: shippingAddress,
      billingAddress: shippingAddress, // Default to shipping
    });

    // ✅ Fetch User & History for Tabby
    const { buyerHistory, orderHistory } = await getTabbyHistory(userId);

    // ✅ FINAL TABBY PAYLOAD (EXACT STRUCTURE)
    const tabbyPayload = {
      payment: {
        ...payment,
        amount: Number(Number(payment.amount).toFixed(2)), // Checklist says number
        currency: payment.currency || "AED",
        description: `Order #${order._id}`,
        buyer: {
          email: payment.buyer?.email,
          name: payment.buyer?.name,
          phone: formatPhone(payment.buyer?.phone),
          id: userId || order._id.toString(),
        },
        shipping_address: {
          city: payment.shipping_address?.city || "Dubai",
          address: payment.shipping_address?.address || payment.shipping_address?.address1 || "N/A",
          zip: payment.shipping_address?.zip || payment.shipping_address?.postalCode || "00000",
        },
        buyer_history: buyerHistory,
        order: {
          ...payment.order,
          reference_id: order._id.toString(), // Use MongoDB ID for easier lookup in webhook
          items: payment.order.items.map(item => ({
            title: item.title || item.name || "Product",
            quantity: Number(item.quantity) || 1,
            unit_price: Number(Number(item.unit_price || 0).toFixed(2)),
            image_url: item.image_url || item.image || "",
            product_url: item.product_url || `${clientUrl}/product/${item.reference_id || item.id || ''}`,
            brand: item.brand || "Montres",
            is_refundable: item.is_refundable !== undefined ? item.is_refundable : true,
            category: item.category || "Watch"
          })),
          shipping_amount: Number(Number(payment.order?.shipping_amount || 0).toFixed(2)),
          tax_amount: Number(Number(payment.order?.tax_amount || 0).toFixed(2))
        },
        order_history: orderHistory
      },
      lang: lang || "en",
      merchant_code: merchant_code || process.env.TABBY_MERCHANT_CODE || "MOWA",
      merchant_urls: {
        success: merchant_urls?.success || merchant_urls?.success_url || `${clientUrl}/checkout/success?orderId=${order._id}`,
        cancel: merchant_urls?.cancel || merchant_urls?.cancel_url || `${clientUrl}/checkout?canceled=true&orderId=${order._id}`,
        failure: merchant_urls?.failure || merchant_urls?.failure_url || `${clientUrl}/checkout?failed=true&orderId=${order._id}`,
      },
    };

    console.log("Tabby Payload:", JSON.stringify(tabbyPayload, null, 2));

    const response = await axios.post(
      "https://api.tabby.ai/api/v2/checkout",
      tabbyPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const checkoutUrl =
      response.data?.configuration?.available_products?.installments?.[0]
        ?.web_url ||
      response.data?.configuration?.available_products?.pay_later?.[0]?.web_url ||
      response.data?.checkout_url;

    if (!checkoutUrl) {
      console.log("Tabby Response Debug:", JSON.stringify(response.data, null, 2));
      return res.status(400).json({
        success: false,
        message: "Checkout URL not received from Tabby",
      });
    }

    order.tabbySessionId = response.data.id;
    await order.save();

    res.status(200).json({
      success: true,
      checkoutUrl,
    });
  } catch (error) {
    console.log(
      "Tabby session creation error:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message:
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create Tabby session",
    });
  }
};



// =====================================================
// ✅ TABBY WEBHOOK HANDLER (FINAL PRODUCTION VERSION)
// =====================================================
const handleWebhook = async (req, res) => {
  try {
    console.log("\n===================================");
    console.log("🔔 TABBY WEBHOOK HIT");
    console.log("Time:", new Date().toISOString());

    const signature = req.headers["x-webhook-signature"] || req.headers["x-tabby-signature"];

    // ---------------------------------
    // RAW BODY FOR SIGNATURE
    // ---------------------------------
    let payload;
    let payloadString;

    if (Buffer.isBuffer(req.body)) {
      payloadString = req.body.toString("utf8");
      try {
        payload = JSON.parse(payloadString);
      } catch (e) {
        console.log("❌ Failed to parse Buffer body:", e.message);
        return res.sendStatus(400);
      }
    } else {
      payload = req.body;
      payloadString = JSON.stringify(payload);
    }

    console.log("📦 Payload Received:", JSON.stringify(payload, null, 2));

    // ---------------------------------
    // VERIFY SIGNATURE (production only)
    // ---------------------------------
    if (process.env.NODE_ENV === "production" && process.env.TABBY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.TABBY_WEBHOOK_SECRET)
        .update(payloadString)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.log("❌ Invalid signature. Received:", signature);
        // Reject invalid signatures as per checklist (optional 401 for debug)
        return res.status(401).json({ success: false, message: "Invalid signature" });
      }
    }

    // ---------------------------------
    // RESPOND IMMEDIATELY TO TABBY
    // ---------------------------------
    res.sendStatus(200);

    // ---------------------------------
    // EXTRACT DATA
    // ---------------------------------
    // Tabby webhooks can be the payment object itself, or wrapped in a 'payment' key
    const payment = payload.payment || payload;

    if (!payment || typeof payment !== 'object') {
      console.log("❌ Payload structure not recognized");
      return;
    }

    const paymentId = payment.id || payload.id;
    const referenceId = payment.order?.reference_id || payment.reference_id || payload.reference_id;
    const status = (payment.status || payload.status)?.toLowerCase();

    console.log("📦 Payment ID:", paymentId);
    console.log("📦 Reference (Reference/Mongo ID):", referenceId);
    console.log("📦 Status:", status);

    if (!paymentId || !referenceId || !status) {
      console.log("❌ Missing required data (paymentId, referenceId, or status)");
      return;
    }

    // ---------------------------------
    // FIND ORDER
    // ---------------------------------
    let savedOrder = await Order.findOne({ orderId: referenceId });

    if (!savedOrder && /^[0-9a-fA-F]{24}$/.test(referenceId)) {
      savedOrder = await Order.findById(referenceId);
    }

    if (!savedOrder) {
      console.log("❌ Order not found");
      return;
    }

    console.log("✅ Order found:", savedOrder._id);

    // =================================
    // HANDLE STATUSES
    // =================================
    switch (status) {

      // =================================
      // AUTHORIZED → AUTO CAPTURE
      // =================================
      case "authorized": {
        console.log("⚡ AUTHORIZED → starting capture");

        try {
          // Verify
          const verify = await axios.get(
            `https://api.tabby.ai/api/v2/payments/${paymentId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
              },
            }
          );

          console.log("🔍 Verified:", verify.data.status);

          // Capture FULL amount
          if (verify.data.status === "AUTHORIZED") {
            console.log("💳 Sending capture request...");

            const captureAmount = typeof verify.data.amount === 'number'
              ? verify.data.amount.toFixed(2)
              : verify.data.amount;

            const captureRes = await axios.post(
              `https://api.tabby.ai/api/v2/payments/${paymentId}/captures`,
              { amount: Number(Number(captureAmount).toFixed(2)) },
              {
                headers: {
                  Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
                },
              }
            );

            console.log("✅ Capture response:", JSON.stringify(captureRes.data, null, 2));
          }
        } catch (err) {
          console.log(
            "❌ Capture failed:",
            err.response?.data || err.message
          );
        }

        return;
      }

      // =================================
      // CAPTURED → MARK PAID
      // =================================
      case "captured": {
        console.log("🎉 CAPTURED → marking order PAID");

        if (savedOrder.paymentStatus === "paid") {
          console.log("Duplicate webhook ignored");
          return;
        }

        savedOrder.paymentStatus = "paid";
        savedOrder.orderStatus = "Processing";
        savedOrder.tabbySessionId = paymentId;

        await savedOrder.save();

        // Clear cart
        if (savedOrder.userId) {
          await userModel.findByIdAndUpdate(savedOrder.userId, {
            $set: { cart: [] },
          });
        }

        console.log("✅ Order updated to PAID");

        return;
      }

      // =================================
      // REFUND
      // =================================
      case "refunded":
      case "refund_completed":
        console.log("↩️ REFUNDED");
        savedOrder.paymentStatus = "refunded";
        await savedOrder.save();
        return;

      // =================================
      // FAILED
      // =================================
      case "rejected":
      case "expired":
        console.log("❌ FAILED");
        savedOrder.paymentStatus = "failed";
        await savedOrder.save();
        return;

      // =================================
      // CLOSED
      // =================================
      case "closed": {
        console.log("⚠️ CLOSED status received");

        // If there are captures, it's effectively PAID
        const hasCaptures = payment.captures && payment.captures.length > 0;

        if (hasCaptures) {
          console.log("🎉 CLOSED with captures → marking order PAID");
          savedOrder.paymentStatus = "paid";
          savedOrder.orderStatus = "Processing";

          if (savedOrder.userId) {
            await userModel.findByIdAndUpdate(savedOrder.userId, {
              $set: { cart: [] },
            });
          }
        } else {
          console.log("⚠️ CLOSED without capture");
          savedOrder.paymentStatus = "closed";
        }

        savedOrder.tabbySessionId = paymentId;
        await savedOrder.save();
        return;
      }

      default:
        console.log("Ignored status:", status);
        return;
    }

  } catch (error) {
    console.log("❌ Webhook crash:", error.message);
  }
};


// ✅ 2. Create Tabby Checkout Order
const createTabbyOrder = async (req, res) => {
  try {
    let { items, shippingAddress, billingAddress, customer, order: frontendOrder, successUrl: frontendSuccessUrl, cancelUrl: frontendCancelUrl, failureUrl: frontendFailureUrl, dummy = false } = req.body || {};

    // --------------------------------------------------
    // ✅ Support frontend nested payload
    // --------------------------------------------------
    if (!items && frontendOrder?.items) items = frontendOrder.items;
    if (!shippingAddress && customer?.shipping) shippingAddress = customer.shipping;
    if (!billingAddress) billingAddress = shippingAddress;

    const buyerInfo = customer?.buyer || frontendOrder?.buyer || {};
    const buyerEmail = buyerInfo.email || shippingAddress?.email || "otp.success@tabby.ai";
    const buyerPhone = buyerInfo.phone || shippingAddress?.phone || "+971500000001";
    const buyerName = buyerInfo.name || `${shippingAddress?.firstName || "Test"} ${shippingAddress?.lastName || "User"}`;

    // --------------------------------------------------
    // ✅ Prepare items
    // --------------------------------------------------
    let populatedItems = [];

    const Product = require("../models/product");
    const { calculateShippingFee } = require("../utils/shippingCalculator");

    if (!dummy && Array.isArray(items) && items.length > 0) {
      populatedItems = await Promise.all(
        items.map(async (it) => {
          const productId = it.productId || it.reference_id || it.id;
          const product = await Product.findById(productId)
            .select("name images salePrice sku referenceNumber")
            .lean();

          if (!product) {
            // Fallback for dummy or manual items
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
      populatedItems = [
        {
          productId: null,
          name: "Dummy Watch",
          image: "",
          price: 100,
          quantity: 1,
          sku: "DUMMY-001"
        },
      ];
    }

    // --------------------------------------------------
    // ✅ Totals
    // --------------------------------------------------
    const subtotal = populatedItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    const { shippingFee, region } = calculateShippingFee({
      country: shippingAddress?.country || "AE",
      subtotal,
    });

    const total = subtotal + shippingFee;

    // --------------------------------------------------
    // ✅ Create Order (Pending)
    // --------------------------------------------------
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

    // --------------------------------------------------
    // ✅ URLs
    // --------------------------------------------------
    const clientUrl = process.env.CLIENT_URL || "https://www.montres.ae";

    const successUrl = frontendSuccessUrl || `${clientUrl}/checkout/success?orderId=${order._id}`;
    const cancelUrl = frontendCancelUrl || `${clientUrl}/checkout?canceled=true&orderId=${order._id}`;
    const failureUrl = frontendFailureUrl || `${clientUrl}/checkout?failed=true&orderId=${order._id}`;

    // --------------------------------------------------
    // ✅ Fetch User & History for Tabby
    // --------------------------------------------------
    const { buyerHistory, orderHistory } = await getTabbyHistory(req.user?.userId);

    // --------------------------------------------------
    // ✅ Tabby items
    // --------------------------------------------------
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
          address: shippingAddress?.address1 || "Downtown",
          zip: shippingAddress?.postalCode || "00000",
        },
        order: {
          reference_id: order._id.toString(),
          items: tabbyItems,
          shipping_amount: String(shippingFee.toFixed(2)),
          tax_amount: "0.00"
        },
        order_history: orderHistory,
      },
      merchant_code: process.env.TABBY_MERCHANT_CODE || "MTAE",
      lang: req.body.language || "en",
      merchant_urls: {
        success: successUrl,
        cancel: cancelUrl,
        failure: failureUrl,
      },
    };

    // --------------------------------------------------
    // ✅ Call Tabby API
    // --------------------------------------------------
    console.log("🟠 Sending Tabby Payload:", JSON.stringify(tabbyPayload, null, 2));

    const response = await axios.post(
      "https://api.tabby.ai/api/v2/checkout",
      tabbyPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;
    console.log("🔵 Tabby Response:", JSON.stringify(data, null, 2));

    const paymentUrl =
      data?.checkout_url ||
      data?.web_url ||
      data?.configuration?.available_products?.installments?.[0]?.web_url ||
      data?.configuration?.products?.installments?.[0]?.web_url ||
      null;

    if (!paymentUrl) {
      return res.status(400).json({
        success: false,
        message: "Tabby checkout unavailable",
        debug: data,
      });
    }

    order.tabbySessionId = data?.id || null;
    await order.save();

    return res.status(201).json({
      success: true,
      order,
      checkoutUrl: paymentUrl,
    });
  } catch (error) {
    console.error("❌ Tabby error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Tabby initialization failed",
    });
  }
};

module.exports = {
  preScoring,
  createSession,
  createTabbyOrder,
  handleWebhook,
};
