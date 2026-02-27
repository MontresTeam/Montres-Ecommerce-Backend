const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./models/product');

async function findExactVanCleef() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find all products where brand contains "Van" and "Cleef"
        const products = await Product.find({ 
            brand: { $regex: /Van.*Cleef/i } 
        }).select('brand name published category stockQuantity inStock').lean();
        
        const results = {
            count: products.length,
            products
        };

        fs.writeFileSync('vancleef_exact_check.json', JSON.stringify(results, null, 2));
        await mongoose.disconnect();
        console.log('Results written to vancleef_exact_check.json');
    } catch (error) {
        console.error('Error:', error);
    }
}

findExactVanCleef();
