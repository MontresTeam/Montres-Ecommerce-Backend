const Order = require("../models/OrderModel");
const User = require("../models/UserModel");
const sendEmail = require("../utils/sendEmail");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const sendOrderConfirmation = async (orderId) => {
    try {
        const order = await Order.findById(orderId).populate("items.productId");
        if (!order) return;

        // -----------------------------
        // 1. CUSTOMER EMAIL (Receipt)
        // -----------------------------
        const customerEmailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Payment Successful!</h2>
        <p>Hi ${order.billingAddress?.firstName || "there"},</p>
        <p>Thank you for your purchase via Stripe. Your payment has been successfully verified.</p>
        
        <div style="background: #f9f9f9; padding: 15px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
            <p style="margin: 5px 0;"><strong>Total Paid:</strong> AED ${order.total}</p>
            <p style="margin: 5px 0;"><strong>Transaction Ref:</strong> ${order.stripePaymentIntentId || "N/A"}</p>
        </div>

        <p>We are now processing your order and will notify you once it ships.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>The Montres Team</strong></p>
      </div>
    `;

        // Send to Customer
        const userEmail = order.billingAddress?.email || order.shippingAddress?.email;
        if (userEmail) {
            await sendEmail(userEmail, "Payment Confirmation - Order #" + order._id, customerEmailHTML);
            console.log(`📧 Customer confirmation sent to ${userEmail}`);
        }

        // -----------------------------
        // 2. ADMIN EMAIL (Notification)
        // -----------------------------
        const adminEmailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #333; border-radius: 8px;">
        <h2 style="color: #2196F3;">💰 Payment Received (Stripe)</h2>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Customer:</strong> ${order.billingAddress?.firstName} ${order.billingAddress?.lastName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Amount:</strong> AED ${order.total}</p>
        <br/>
        <p>The payment status has been updated to <strong>PAID</strong>.</p>
        <p style="color: red;">Please proceed with fulfillment.</p>
      </div>
    `;

        // Send to Admin & Sales
        if (process.env.ADMIN_EMAIL) {
            await sendEmail(process.env.ADMIN_EMAIL, `💰 Payment Received: Order #${order._id}`, adminEmailHTML);
        }
        if (process.env.SALES_EMAIL) {
            await sendEmail(process.env.SALES_EMAIL, `💰 Payment Received: Order #${order._id}`, adminEmailHTML);
        }
        console.log("📧 Admin notification sent.");

    } catch (error) {
        console.error("Error sending order confirmation:", error);
    }
};

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
            const orderId = session.metadata?.orderId;

            console.log(`🔄 Processing session for Order: ${orderId}`);

            if (orderId) {
                // Check if order exists before updating
                const existingOrder = await Order.findById(orderId);
                if (!existingOrder) {
                    console.error(`❌ ERROR: Order ${orderId} found in metadata but NOT in database!`);
                    return res.status(404).send("Order not found");
                }

                if (existingOrder.paymentStatus === "paid") {
                    console.log(`ℹ️ Order ${orderId} is already marked as PAID.`);
                }

                // IDEMPOTENCY: Atomic update
                // This ensures we only run logic if status was NOT 'paid'
                const order = await Order.findOneAndUpdate(
                    { _id: orderId, paymentStatus: { $ne: "paid" } },
                    {
                        $set: {
                            paymentStatus: "paid",
                            stripePaymentIntentId: session.payment_intent,
                            orderStatus: "Processing",
                            paidAt: new Date()
                        }
                    },
                    { new: true }
                );

                // We use existingOrder as fallback if order is null (meaning it was already paid)
                const targetOrder = order || existingOrder;

                if (targetOrder) {
                    // Update user: Clear cart and add order to orders array
                    if (targetOrder.userId) {
                        await User.findByIdAndUpdate(targetOrder.userId, {
                            $set: { cart: [] },
                            $addToSet: { orders: targetOrder._id }
                        });
                        console.log(`🛒 Cart sync'd for user: ${targetOrder.userId}`);
                    }

                    // Send email only if we just marked it as paid (order is not null)
                    if (order) {
                        await sendOrderConfirmation(order._id);
                    }
                }
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

module.exports = {
    handleStripeWebhook,
};