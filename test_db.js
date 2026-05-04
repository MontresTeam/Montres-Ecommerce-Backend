require('dotenv').config({ path: 'C:\\Users\\farhan\\Montres-Ecommerce-Backend\\.env' });
const mongoose = require('mongoose');
const Product = require('./models/product');

async function checkDb() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");
  
  const coachProducts = await Product.find({ 
    $or: [
      { slug: /coach/i },
      { brand: /coach/i }
    ]
  }).select('name slug brand category').lean();
  
  console.log("Coach products found:", coachProducts.length);
  console.log(coachProducts.slice(0, 5));

  const diorProducts = await Product.find({ 
    $or: [
      { slug: /christian-dior/i },
      { brand: /christian dior/i }
    ]
  }).select('name slug brand category').lean();
  
  console.log("Dior products found:", diorProducts.length);
  console.log(diorProducts.slice(0, 2));

  mongoose.disconnect();
}

checkDb().catch(console.error);
