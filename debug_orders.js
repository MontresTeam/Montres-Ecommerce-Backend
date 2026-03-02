const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/OrderModel');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const sampleOrder = await Order.findOne().lean();
  console.log('Sample Order structure:', JSON.stringify(sampleOrder, null, 2));
  
  const email = sampleOrder?.shippingAddress?.email;
  if (email) {
    const ordersByEmail = await Order.find({ "shippingAddress.email": email }).lean();
    console.log(`Found ${ordersByEmail.length} orders for email: ${email}`);
  }
  
  process.exit(0);
}

check();
