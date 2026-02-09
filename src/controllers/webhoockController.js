const Order = require("../models/OrderModel");
const User = require("../models/UserModel");
const sendEmail = require("../utils/sendEmail");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const axios = require("axios");

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const TAMARA_WEBHOOK_SECRET = process.env.TAMARA_NOTIFICATION_KEY || process.env.TAMARA_WEBHOOK_SECRET;


const sendOrderConfirmation = require("../utils/sendOrderConfirmation");

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    console.log("--------------------------------------------------");
    console.log("🔔 STRIPE WEBHOOK HIT");

    // Check if body is buffer
    const isBuffer = Buffer.isBuffer(req.body);
    console.log(`📦 Body Type: ${typeof req.body}, isBuffer: ${isBuffer}`);

    // If not buffer, and we can't construct event, we might need to rely on the raw-body middleware in routes

    try {
        if (!STRIPE_WEBHOOK_SECRET) {
            console.error("❌ CRITICAL: STRIPE_WEBHOOK_SECRET is not defined in .env!");
            return res.status(500).send("Webhook secret not configured");
        }

        console.log(`🔑 Loaded Secret Prefix: ${STRIPE_WEBHOOK_SECRET.substring(0, 10)}...`);
        console.log(`🔑 Expected Secret Prefix: whsec_a4f...`);


        if (!sig) {
            console.error("❌ ERROR: No stripe-signature header found.");
            return res.status(400).send("Missing signature header");
        }

        // Stripe requires the RAW body for verification. 
        // In our route we used express.raw(), so req.body SHOULD be a buffer.
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
        console.log(`✅ Signature Verified. Event Type: ${event.type}`);
    } catch (err) {
        console.error(`❌ Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const referenceId = session.metadata?.orderId;
            const userId = session.metadata?.userId;
            const shippingInfoRaw = session.metadata?.shippingInfo;

            console.log(`🔄 Processing session for Reference ID: ${referenceId}`);

            if (referenceId) {
                // Check if order exists (by MongoDB id or our custom reference orderId field)
                let order = await Order.findOne({ $or: [{ orderId: referenceId }, { stripeSessionId: session.id }] });

                if (!order) {
                    console.log(`📝 Reconstructing order for Stripe Reference: ${referenceId}`);

                    // Fetch line items from Stripe to get product info with expanded product details
                    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                        expand: ['data.price.product'],
                    });

                    const reconstructedItems = lineItems.data.map(item => {
                        const product = item.price.product;
                        return {
                            productId: product.metadata?.productId || null,
                            name: item.description,
                            price: item.amount_total / 100 / (item.quantity || 1),
                            quantity: item.quantity,
                            image: product.images?.[0] || ""
                        };
                    });

                    const shippingDetails = session.shipping_details || {};
                    const buyerEmail = session.customer_details?.email;
                    const buyerName = session.customer_details?.name || "Customer";

                    let shippingAddr = {};
                    if (shippingInfoRaw) {
                        try {
                            shippingAddr = JSON.parse(shippingInfoRaw);
                        } catch (e) {
                            console.error("Failed to parse shipping info from metadata", e);
                        }
                    }

                    order = await Order.create({
                        userId: (userId && userId !== "null") ? userId : null,
                        orderId: referenceId,
                        items: reconstructedItems,
                        subtotal: (session.amount_subtotal / 100),
                        shippingFee: (session.total_details?.amount_shipping / 100 || 0),
                        total: (session.amount_total / 100),
                        paymentMethod: "stripe",
                        paymentStatus: "paid",
                        orderStatus: "Processing",
                        currency: session.currency?.toUpperCase() || "AED",
                        stripeSessionId: session.id,
                        stripePaymentIntentId: session.payment_intent,
                        shippingAddress: {
                            firstName: shippingAddr.firstName || buyerName.split(" ")[0] || "Customer",
                            lastName: shippingAddr.lastName || buyerName.split(" ").slice(1).join(" ") || "",
                            email: buyerEmail,
                            phone: shippingAddr.phone || session.customer_details?.phone || "",
                            city: shippingDetails.address?.city || shippingAddr.city || "N/A",
                            street: shippingDetails.address?.line1 || shippingAddr.address1 || "N/A",
                            country: shippingDetails.address?.country || shippingAddr.country || "AE",
                            postalCode: shippingDetails.address?.postal_code || shippingAddr.postalCode || ""
                        },
                        billingAddress: {
                            firstName: buyerName.split(" ")[0] || "Customer",
                            lastName: buyerName.split(" ").slice(1).join(" ") || "",
                            email: buyerEmail,
                            phone: session.customer_details?.phone || "",
                            city: session.customer_details?.address?.city || "N/A",
                            street: session.customer_details?.address?.line1 || "N/A",
                            country: session.customer_details?.address?.country || "AE",
                            postalCode: session.customer_details?.address?.postal_code || ""
                        }
                    });

                    console.log(`✅ Order created successfully: ${order._id}`);
                } else if (order.paymentStatus !== "paid") {
                    order.paymentStatus = "paid";
                    order.orderStatus = "Processing";
                    order.stripePaymentIntentId = session.payment_intent;
                    order.paidAt = new Date();
                    await order.save();
                    console.log(`✅ Existing order ${order._id} marked as PAID.`);
                }

                // Finalize: Clear cart and send email
                if (order.userId) {
                    await User.findByIdAndUpdate(order.userId, {
                        $set: { cart: [] },
                        $addToSet: { orders: order._id }
                    });
                }

                await sendOrderConfirmation(order._id);
            } else {
                console.error("❌ ERROR: orderId missing from Stripe session metadata!");
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error(`❌ Webhook Processing Exception: ${error.message}`);
        res.status(500).json({ error: "Internal processing error" });
    }
    console.log("--------------------------------------------------");
};

// ===============================
// Tamara Webhook Helpers
// ===============================
const verifyTamaraSignature = (req) => {
    // Sandbox → no signature if set explicitly or if in development
    if (process.env.NODE_ENV !== "production") {
        console.log("⚠️ Tamara sandbox mode – skipping signature verification");
        return true;
    }

    const signature =
        req.headers["x-tamara-signature"] ||
        req.headers["x-tamara-notification-signature"];

    if (!signature) {
        console.error("Tamara signature header missing");
        return false;
    }

    if (!TAMARA_WEBHOOK_SECRET) {
        console.error("TAMARA_WEBHOOK_SECRET (or TAMARA_NOTIFICATION_KEY) missing in .env");
        return false;
    }

    const expectedSignature = crypto
        .createHmac("sha256", TAMARA_WEBHOOK_SECRET)
        .update(req.body)
        .digest("hex");

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
};

// ===============================
// Tamara Webhook Handler
// ===============================
const handleTamaraWebhook = async (req, res) => {
    try {
        console.log("--------------------------------------------------");
        console.log("🔔 TAMARA WEBHOOK HIT");

        // Verify signature (skips in dev)
        if (!verifyTamaraSignature(req)) {
            console.error("❌ Invalid Tamara signature attempt");
            return res.status(401).json({ message: "Invalid signature" });
        }

        const notification = JSON.parse(req.body.toString());
        console.log("📦 Tamara Notification:", JSON.stringify(notification, null, 2));

        const referenceId = notification.order_reference_id;
        const tamaraOrderId = notification.order_id;
        const status = notification.event_type || notification.order_status;

        // ✅ APPROVED / AUTHORIZED
        if (status === "approved" || status === "order_authorized") {
            let order = await Order.findOne({ $or: [{ orderId: referenceId }, { tamaraOrderId: tamaraOrderId }] });

            if (!order) {
                console.log(`📝 Reconstructing order for Tamara Reference: ${referenceId}`);

                // Fetch full order details from Tamara
                const tamaraResponse = await axios.get(`${process.env.TAMARA_API_BASE}/orders/${tamaraOrderId}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.TAMARA_SECRET_KEY}`,
                    },
                });

                const tamaraOrder = tamaraResponse.data;

                const reconstructedItems = tamaraOrder.items.map(item => ({
                    productId: item.reference_id && item.reference_id.match(/^[0-9a-fA-F]{24}$/) ? item.reference_id : null,
                    name: item.name,
                    price: item.unit_price.amount,
                    quantity: item.quantity,
                    image: "" // Tamara doesn't always provide image URLs in the order object
                }));

                const consumer = tamaraOrder.consumer || {};
                const shipping = tamaraOrder.shipping_address || {};
                const billing = tamaraOrder.billing_address || shipping;

                const userIdFromRef = referenceId.includes('_tamara_') ? referenceId.split('_tamara_')[0] : null;

                order = await Order.create({
                    userId: (userIdFromRef && userIdFromRef !== 'guest') ? userIdFromRef : null,
                    orderId: referenceId,
                    items: reconstructedItems,
                    subtotal: tamaraOrder.total_amount.amount - tamaraOrder.shipping_amount.amount - tamaraOrder.tax_amount.amount,
                    shippingFee: tamaraOrder.shipping_amount.amount,
                    total: tamaraOrder.total_amount.amount,
                    paymentMethod: "tamara",
                    paymentStatus: "paid",
                    orderStatus: "Processing",
                    currency: tamaraOrder.total_amount.currency || "AED",
                    tamaraOrderId: tamaraOrderId,
                    shippingAddress: {
                        firstName: shipping.first_name || consumer.first_name || "Customer",
                        lastName: shipping.last_name || consumer.last_name || "",
                        email: consumer.email,
                        phone: shipping.phone_number || consumer.phone_number,
                        city: shipping.city || "N/A",
                        street: shipping.line1 || "N/A",
                        country: shipping.country_code || "AE",
                        postalCode: shipping.postal_code || ""
                    },
                    billingAddress: {
                        firstName: billing.first_name || consumer.first_name || "Customer",
                        lastName: billing.last_name || consumer.last_name || "",
                        email: consumer.email,
                        phone: billing.phone_number || consumer.phone_number,
                        city: billing.city || "N/A",
                        street: billing.line1 || "N/A",
                        country: billing.country_code || "AE",
                        postalCode: billing.postal_code || ""
                    }
                });

                console.log(`✅ Order created successfully: ${order._id}`);
            } else if (order.paymentStatus !== "paid") {
                order.paymentStatus = "paid";
                order.orderStatus = "Processing";
                order.tamaraOrderId = tamaraOrderId;
                order.paidAt = new Date();
                await order.save();
                console.log(`✅ Existing order ${order._id} marked as PAID via Tamara`);
            }

            // Finalize
            if (order.userId) {
                await User.findByIdAndUpdate(order.userId, {
                    $set: { cart: [] },
                    $addToSet: { orders: order._id },
                });
            }

            await sendOrderConfirmation(order._id);

        }
        // ❌ FAILED / CANCELLED
        else if (
            status === "order_failed" ||
            status === "order_cancelled" ||
            status === "order_declined" ||
            status === "failed" ||
            status === "cancelled"
        ) {
            await Order.findOneAndUpdate(
                { orderId: referenceId, paymentStatus: { $ne: "paid" } },
                {
                    paymentStatus: "failed",
                    orderStatus: "Cancelled",
                }
            );

            console.log(`❌ Order ${referenceId} marked FAILED/CANCELLED via Tamara`);
        }

        console.log("--------------------------------------------------");
        return res.sendStatus(204);
    } catch (error) {
        console.error("❌ Tamara Webhook Error:", error);
        return res.status(500).json({ message: "Webhook handler failed" });
    }
};

module.exports = {
    handleStripeWebhook,
    handleTamaraWebhook,
};