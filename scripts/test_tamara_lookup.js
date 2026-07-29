const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testTamaraLookup() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Order = require(path.join(__dirname, '..', 'models', 'OrderModel'));

    const tamaraOrders = await Order.find({ paymentMethod: "tamara" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`Found ${tamaraOrders.length} Tamara orders to inspect:`);

    const secretKey = process.env.TAMARA_SECRET_KEY;
    const baseUrl = process.env.TAMARA_API_BASE || "https://api.tamara.co";

    console.log(`Using TAMARA_API_BASE: ${baseUrl}`);

    for (const o of tamaraOrders) {
      console.log(`\nOrder _id: ${o._id} | paymentStatus: ${o.paymentStatus} | orderStatus: ${o.orderStatus} | total: ${o.total} AED | tamaraOrderId: ${o.tamaraOrderId || 'NONE'}`);
      if (!o.tamaraOrderId) continue;

      try {
        const res = await axios.get(`${baseUrl}/orders/${o.tamaraOrderId}`, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/json"
          },
          timeout: 5000
        });
        console.log(`  -> Tamara Status: ${res.data.status}`);
        console.log(`  -> Tamara Order Reference: ${res.data.order_reference_id}`);
        console.log(`  -> Total Amount: ${res.data.total_amount?.amount} ${res.data.total_amount?.currency}`);
        if (res.data.transactions) {
          console.log(`  -> Transactions:`, JSON.stringify(res.data.transactions));
        }
      } catch (err) {
        console.log(`  -> Tamara API Error: ${err.response?.status} - ${JSON.stringify(err.response?.data || err.message)}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

testTamaraLookup();
