/**
 * Full Order Email Test
 * Run: node scratch/testOrderEmail.js
 *
 * Fetches the latest PAID order from DB and fires both
 * the admin + customer emails through sendOrderConfirmation.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose    = require("mongoose");
const Order       = require("../models/OrderModel");
const sendOrderConfirmation = require("../utils/sendOrderConfirmation");

(async () => {
    try {
        console.log("─────────────────────────────────────────");
        console.log("  Montres — Full Order Confirmation Test");
        console.log("─────────────────────────────────────────");

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connected");

        // Get the most recent paid order
        const order = await Order.findOne({ paymentStatus: "paid" })
            .sort({ createdAt: -1 })
            .lean();

        if (!order) {
            console.warn("⚠️  No paid orders found in DB — nothing to test");
            process.exit(0);
        }

        console.log(`\n📦 Using order: ${order._id}`);
        console.log(`   Payment Method : ${order.paymentMethod}`);
        console.log(`   Total          : ${order.currency || "AED"} ${order.total}`);

        const customerEmail =
            order.billingAddress?.email ||
            order.shippingAddress?.email ||
            null;
        console.log(`   Customer Email : ${customerEmail || "⚠️  NOT FOUND — will skip customer email"}`);
        console.log(`   Admin Email    : ${process.env.ADMIN_EMAIL}`);
        console.log(`   Sales Email    : ${process.env.SALES_EMAIL}`);

        console.log("\n📧 Sending emails...\n");
        await sendOrderConfirmation(order._id);

        console.log("\n✅ Done. Check inboxes:\n");
        if (customerEmail) console.log(`   Customer → ${customerEmail}`);
        console.log(`   Admin    → ${process.env.ADMIN_EMAIL}`);
        if (process.env.SALES_EMAIL !== process.env.ADMIN_EMAIL) {
            console.log(`   Sales    → ${process.env.SALES_EMAIL}`);
        }
        console.log("─────────────────────────────────────────\n");

    } catch (err) {
        console.error("❌ Test failed:", err.message || err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
})();
