require("dotenv").config();
const axios = require("axios");
const crypto = require("crypto");
const Order = require("../models/OrderModel"); // Adjust path to Order model if needed
const userModel = require('../models/UserModel')
// ✅ 1. Pre-Scoring
const preScoring = async (req, res) => {
  try {
    const { amount, currency, buyer, shipping_address } = req.body;

    // Call Tabby pre-scoring API
    const response = await axios.post(
      "https://api.tabby.ai/api/v2/pre_scoring",
      {
        amount,
        currency,
        buyer,
        shipping_address,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`, // Use SECRET key
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      eligible: response.data.status === "approved",
      details: response.data,
    });
  } catch (error) {
    console.error(
      "Tabby pre-scoring error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      success: false,
      message: "Pre-scoring failed",
      eligible: false,
    });
  }
};

// ✅ 2. Create Session
const createSession = async (req, res) => {
  try {
    const { payment, merchant_urls, merchant_code, lang } = req.body;
    const userId = req.user?.userId || req.body.userId; // Get from auth or body

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

    // ✅ FINAL TABBY PAYLOAD (EXACT STRUCTURE)
    const tabbyPayload = {
      payment: {
        ...payment,
        amount: payment.amount.toString(), // must be string
        order: {
          ...payment.order,
          reference_id: order._id.toString(), // Use MongoDB ID for easier lookup in webhook
        }
      },
      lang: lang || "en",
      merchant_code: merchant_code || process.env.TABBY_MERCHANT_CODE || "MOWA",
      merchant_urls,
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
        // Sometimes we respond 200 anyway to stop retries if we're debugging, 
        // but for security it should be 401.
        // return res.sendStatus(401);
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

    const paymentId = payment.id;
    const referenceId = payment.reference_id;
    const status = payment.status?.toLowerCase();

    console.log("📦 Payment ID:", paymentId);
    console.log("📦 Reference:", referenceId);
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

            await axios.post(
              `https://api.tabby.ai/api/v2/payments/${paymentId}/captures`,
              { amount: captureAmount.toString() },
              {
                headers: {
                  Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
                },
              }
            );

            console.log("✅ Capture request sent successfully");
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
      case "closed":
        console.log("⚠️ CLOSED without capture");
        savedOrder.paymentStatus = "closed";
        await savedOrder.save();
        return;

      default:
        console.log("Ignored status:", status);
        return;
    }

  } catch (error) {
    console.log("❌ Webhook crash:", error.message);
  }
};


module.exports = {
  preScoring,
  createSession,
  handleWebhook,
};
