const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/product');

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const searchTerms = [
            'Alfred Dunhill',
            'Dunhill Pen'
        ];

        for (const term of searchTerms) {
            const products = await Product.find({ name: { $regex: term, $options: 'i' } }).limit(10);
            console.log(`\n--- Searching for "${term}" (${products.length} found) ---`);
            products.forEach(p => {
                console.log(`  Name: ${p.name}`);
                console.log(`  Slug: ${p.slug}`);
                console.log(`  ID: ${p._id}`);
                console.log(`  Category: ${p.category}`);
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkProducts();
