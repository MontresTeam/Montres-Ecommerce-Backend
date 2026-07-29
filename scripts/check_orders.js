const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function checkOrders() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const Order = require(path.join(__dirname, '..', 'models', 'OrderModel'));

    const breakdown = await Order.aggregate([
      {
        $group: {
          _id: { method: "$paymentMethod", status: "$paymentStatus" },
          count: { $sum: 1 },
          totalAmount: { $sum: "$total" }
        }
      },
      { $sort: { "_id.method": 1, "_id.status": 1 } }
    ]);

    console.log("\n=================== AGGREGATED SUMMARY ===================");
    console.table(breakdown.map(b => ({
      Method: b._id.method,
      PaymentStatus: b._id.status,
      Count: b.count,
      TotalAED: Math.round(b.totalAmount)
    })));

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

checkOrders();
