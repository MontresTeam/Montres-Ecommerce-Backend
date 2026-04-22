const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/product');

async function checkShortSlugs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({ 
            category: 'Accessories',
            $expr: { $lt: [{ $strLenCP: "$slug" }, 15] } 
        });

        console.log(`Found ${products.length} accessories with short slugs (< 15 chars):`);
        products.forEach(p => {
            console.log(`  ID: ${p._id}`);
            console.log(`  Name: ${p.name}`);
            console.log(`  Slug: ${p.slug}`);
            console.log(`  Brand: ${p.brand}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkShortSlugs();
