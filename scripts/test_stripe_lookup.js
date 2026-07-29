const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeLookup() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Order = require(path.join(__dirname, '..', 'models', 'OrderModel'));

    const stripeOrders = await Order.find({ paymentMethod: "stripe" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`Found ${stripeOrders.length} Stripe orders to inspect:`);

    for (const o of stripeOrders) {
      console.log(`\nOrder _id: ${o._id} | Status: ${o.paymentStatus} | Total: ${o.total} AED | stripeSessionId: ${o.stripeSessionId || 'NONE'}`);
      if (!o.stripeSessionId) continue;

      try {
        const session = await stripe.checkout.sessions.retrieve(o.stripeSessionId);
        console.log(`  -> Stripe Session Status : ${session.status}`);
        console.log(`  -> Stripe Payment Status : ${session.payment_status}`);
        console.log(`  -> Customer Email       : ${session.customer_details?.email || 'N/A'}`);
      } catch (err) {
        console.log(`  -> Stripe API Error: ${err.message}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

testStripeLookup();
