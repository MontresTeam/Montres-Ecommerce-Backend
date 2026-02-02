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

    if (!payment || !payment.order) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment data",
      });
    }



    // ✅ Create order in DB
    const order = await Order.create({
      orderId: payment.order.reference_id,
      items: payment.order.items.map((item) => ({
        name: item.title,
        price: Number(item.unit_price),
        quantity: item.quantity,
      })),
      total: Number(payment.amount),
      currency: payment.currency,
      paymentMethod: "tabby",
      paymentStatus: "pending",
      orderStatus: "Pending",
      shippingAddress: {
        name: payment.buyer.name,
        email: payment.buyer.email,
        phone: payment.buyer.phone,
      },
    });

    // ✅ FINAL TABBY PAYLOAD (EXACT STRUCTURE)
    const tabbyPayload = {
      payment: {
        ...payment,
        amount: payment.amount.toString(), // must be string
      },
      lang: lang || "en",
      merchant_code: merchant_code || "MOWA",
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
      response.data?.configuration?.available_products?.pay_later?.[0]?.web_url;

    if (!checkoutUrl) {
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
        "Failed to create Tabby session",
    });
  }
};




// =======================================
// ✅ TABBY WEBHOOK HANDLER (FINAL SAFE)
// =======================================
const handleWebhook = async (req, res) => {
  try {
    console.log("🔔 Tabby Webhook Received");

    const signature = req.headers["x-webhook-signature"];

    // -----------------------------------
    // Get RAW payload for signature
    // -----------------------------------
    const payloadString = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : JSON.stringify(req.body);

    const payload = JSON.parse(payloadString);


    // -----------------------------------
    // Signature verification
    // (skip in local dev if needed)
    // -----------------------------------
    if (process.env.NODE_ENV === "production") {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.TABBY_WEBHOOK_SECRET)
        .update(payloadString)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("❌ Invalid Tabby signature");
        return res.sendStatus(401);
      }
    }


    // -----------------------------------
    // Respond immediately (IMPORTANT)
    // -----------------------------------
    res.sendStatus(200);


    // -----------------------------------
    // Extract data
    // -----------------------------------
    const { status, order, refunds, id } = payload;
    const referenceId = order?.reference_id;

    console.log("Status:", status);
    console.log("Order Reference:", referenceId);

    if (!referenceId) {
      console.error("❌ No reference ID provided in webhook");
      return;
    }

    // ✅ FIND ORDER (Robust Strategy)
    // 1. Try finding by custom orderId
    // 2. Fallback to _id if it looks like a MongoID
    let savedOrder = await Order.findOne({ orderId: referenceId });

    // Fallback check: strict regex for MongoDB ObjectId (24 hex characters)
    if (!savedOrder && /^[0-9a-fA-F]{24}$/.test(referenceId)) {
      console.log(`⚠️ Order not found by unique orderId. Trying fallback to _id for: ${referenceId}`);
      savedOrder = await Order.findById(referenceId);
    }

    if (!savedOrder) {
      console.error(`❌ Order not found in DB for reference: ${referenceId}`);
      return;
    }

    console.log(`✅ Order matched: ${savedOrder._id} | Current Status: ${savedOrder.paymentStatus}`);


    // -----------------------------------
    // Process payment statuses
    // -----------------------------------
    switch (status) {

      // -------------------------------
      // AUTHORIZED (ignore)
      // -------------------------------
      case "authorized":
        console.log("Payment authorized - waiting for closed");
        return;


      // -------------------------------
      // CLOSED = SUCCESS PAYMENT
      // -------------------------------
      case "closed": {

        // Refund
        if (refunds?.length) {
          console.log("Refund detected");
          savedOrder.paymentStatus = "refunded";
          await savedOrder.save();
          return;
        }

        // Prevent duplicate updates
        if (savedOrder.paymentStatus === "paid") {
          console.log("Already paid (duplicate webhook ignored)");
          return;
        }

        console.log("✅ Marking order as PAID");

        savedOrder.paymentStatus = "paid";
        savedOrder.orderStatus = "Processing";
        savedOrder.tabbySessionId = id;

        await savedOrder.save();

        // Clear cart
        if (savedOrder.userId) {
          await userModel.findByIdAndUpdate(savedOrder.userId, {
            $set: { cart: [] },
          });
        }

        return;
      }


      // -------------------------------
      // FAILED
      // -------------------------------
      case "rejected":
      case "expired":
        console.log("❌ Payment failed");

        savedOrder.paymentStatus = "failed";
        await savedOrder.save();

        return;


      // -------------------------------
      // Ignore others
      // -------------------------------
      default:
        console.log("Ignored status:", status);
        return;
    }

  } catch (error) {
    console.error("❌ Webhook error:", error.message);
  }
};



module.exports = {
  preScoring,
  createSession,
  handleWebhook,
};
