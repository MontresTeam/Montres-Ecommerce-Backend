const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testTabbyLookup() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Order = require(path.join(__dirname, '..', 'models', 'OrderModel'));

    const tabbyOrders = await Order.find({ paymentMethod: "tabby", paymentStatus: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`Found ${tabbyOrders.length} pending Tabby orders to test:`);

    const secretKey = process.env.TABBY_SECRET_KEY;
    const baseUrl = process.env.TABBY_BASE_URL || "https://api.tabby.ai/api/v2";

    console.log(`Using TABBY_SECRET_KEY: ${secretKey}`);
    console.log(`Using TABBY_BASE_URL: ${baseUrl}`);

    for (const o of tabbyOrders) {
      console.log(`\nChecking Order ${o._id} | TabbySessionId: ${o.tabbySessionId || 'MISSING'}`);
      if (!o.tabbySessionId) continue;

      try {
        const res = await axios.get(`${baseUrl}/payments/${o.tabbySessionId}`, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json"
          },
          timeout: 5000
        });
        console.log(`  -> Tabby API Response Status: ${res.status}`);
        console.log(`  -> Tabby Payment Status: ${res.data.status}`);
        console.log(`  -> Tabby Rejection/Details:`, res.data.rejection_reason || "None");
      } catch (err) {
        console.log(`  -> Tabby API Error: ${err.response?.status} - ${JSON.stringify(err.response?.data || err.message)}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

testTabbyLookup();
