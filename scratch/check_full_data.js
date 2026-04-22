const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/product');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const ids = [
            '69e796f8026df198fe5b4215', // ST Dupont
            '69e78eff026df198fe5b413d'  // Dunhill
        ];

        for (const id of ids) {
            const product = await Product.findById(id);
            console.log(`\n--- Data for ${id} ---`);
            console.log(`  Name: ${product.name}`);
            console.log(`  Slug: ${product.slug}`);
            console.log(`  Category: ${product.category}`);
            console.log(`  Price: ${product.salePrice}`);
            console.log(`  Images: ${product.images.length}`);
            console.log(`  Published: ${product.published}`);
            console.log(`  Stock: ${product.stockQuantity}`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData();
