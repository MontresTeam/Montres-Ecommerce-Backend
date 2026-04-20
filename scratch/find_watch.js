const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Product = require('../models/product');

const findProduct = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('MONGODB_URI not found in env');
        return;
    }
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const slug = 'rado-diastar-1-chronometer-limited-edition-346500j';
    
    // Check by slug
    let product = await Product.findOne({ slug: slug });
    console.log('Find by exact slug:', product ? 'Found: ' + product.name : 'Not Found');

    if (!product) {
      // Check by regex name
      const items = slug.split('-').filter(Boolean);
      const pattern = items.join('[\\s-]+');
      product = await Product.findOne({ name: { $regex: new RegExp(`^${pattern}`, 'i') } });
      console.log('Find by regex name:', product ? 'Found: ' + product.name : 'Not Found');
    }

    if (!product) {
       // Check by name contains
       product = await Product.findOne({ name: { $regex: /rado/i, $regex: /diastar/i, $regex: /limited/i } });
       console.log('Find by name contains (rado && diastar && limited):', product ? 'Found: ' + product.name : 'Not Found');
    }

    if (product) {
      console.log('Product details:');
      console.log('ID:', product._id);
      console.log('Name:', product.name);
      console.log('Slug:', product.slug);
      console.log('Published:', product.published);
      console.log('SKU:', product.sku);
      console.log('Ref:', product.referenceNumber);
    } else {
        // List all products starting with Rado Diastar
        const similar = await Product.find({ name: { $regex: /^Rado Diastar/i } }).limit(5);
        console.log('Similar products starting with Rado Diastar:');
        similar.forEach(p => console.log(`- ${p.name} (Slug: ${p.slug}, Published: ${p.published})`));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

findProduct();
