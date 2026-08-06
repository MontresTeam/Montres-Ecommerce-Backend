const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/product');

function createBaseSlug(brand, name) {
  const brandStr = (brand || '').trim().toLowerCase();
  const nameStr = (name || '').trim().toLowerCase();

  let combined = nameStr;
  if (brandStr && !nameStr.startsWith(brandStr)) {
    combined = `${brandStr} ${nameStr}`;
  }

  return combined
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function fixDuplicateSlugs() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/montres';
    console.log('Connecting to MongoDB:', uri);
    await mongoose.connect(uri);

    const products = await Product.find({}).sort({ createdAt: 1 });
    console.log(`Found ${products.length} total products in database.`);

    const usedSlugs = new Set();
    let updatedCount = 0;
    let targetProductSlug = '';

    for (const product of products) {
      const baseSlug = createBaseSlug(product.brand, product.name);
      let newSlug = baseSlug;

      // If base slug is empty fallback to ID
      if (!newSlug) {
        newSlug = `product-${product._id.toString()}`;
      }

      // If slug is already used by another product in this pass, append id suffix
      if (usedSlugs.has(newSlug)) {
        const idSuffix = product._id.toString().slice(-6);
        if (product.referenceNumber) {
          const cleanRef = product.referenceNumber.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          if (cleanRef && !newSlug.includes(cleanRef)) {
            newSlug = `${newSlug}-${cleanRef}-${idSuffix}`;
          } else {
            newSlug = `${newSlug}-${idSuffix}`;
          }
        } else {
          newSlug = `${newSlug}-${idSuffix}`;
        }
      }

      // Double check uniqueness loop if needed
      let counter = 1;
      let finalSlug = newSlug;
      while (usedSlugs.has(finalSlug)) {
        finalSlug = `${newSlug}-${counter}`;
        counter++;
      }

      usedSlugs.add(finalSlug);

      if (product.slug !== finalSlug) {
        product.slug = finalSlug;
        await Product.updateOne({ _id: product._id }, { $set: { slug: finalSlug } });
        updatedCount++;
      }

      if (product._id.toString() === '692c6e896a659306d7f473d6') {
        targetProductSlug = finalSlug;
        console.log(`\n🎯 TARGET PRODUCT (692c6e896a659306d7f473d6): Name="${product.name}", Brand="${product.brand}", Slug="${finalSlug}"`);
      }
    }

    console.log(`\n✅ Slug migration complete! Updated ${updatedCount} products.`);

    // Verify duplicate count
    const allProds = await Product.find({}).select('_id slug');
    const slugMap = {};
    allProds.forEach(p => {
      if (p.slug) {
        if (!slugMap[p.slug]) slugMap[p.slug] = [];
        slugMap[p.slug].push(p._id);
      }
    });

    let dupes = 0;
    Object.keys(slugMap).forEach(s => {
      if (slugMap[s].length > 1) {
        dupes++;
        console.error(`❌ Duplicate found for slug "${s}":`, slugMap[s]);
      }
    });

    console.log(`Verification: Remaining duplicate slugs count = ${dupes}`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

fixDuplicateSlugs();
