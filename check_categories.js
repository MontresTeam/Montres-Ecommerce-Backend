const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/montres');
  const Product = require('./models/product.js');
  
  const items = await Product.aggregate([
    { $match: { categorisOne: 'leather' } },
    { $group: { _id: '$leatherMainCategory', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  console.log(items);

  process.exit(0);
}

check();
