const mongoose = require('mongoose');
require('dotenv').config({path: './.env'});

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/montres');
  const Product = require('./models/product.js');
  
  const p = await Product.find({ categorisOne: "leather" })
    .select('category categorisOne leatherMainCategory leatherSubCategory subcategory name brand model')
    .limit(20);
    
  console.log("categorisOne=leather count:", p.length);
  console.log(JSON.stringify(p, null, 2));

  const allLeather = await Product.find({ category: { $regex: /leather/i } })
    .select('category categorisOne leatherMainCategory leatherSubCategory subcategory name brand model')
    .limit(20);

  console.log("category matched 'leather' count:", allLeather.length);
  console.log(JSON.stringify(allLeather, null, 2));

  // Find specifically what the user might be looking for
  const wallets = await Product.find({
    $or: [
      { leatherMainCategory: { $regex: /wallet/i } },
      { name: { $regex: /wallet/i } }
    ]
  }).select('category categorisOne leatherMainCategory leatherSubCategory subcategory name brand model').limit(5);
  
  console.log("Wallets count:", wallets.length);
  console.log(JSON.stringify(wallets, null, 2));

  process.exit(0);
}

check();
