const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./models/product');

async function findVanCleef() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find all unique brand names starting with Van
        const brands = await Product.distinct('brand', { brand: /^Van/i });
        
        const results = {
            brands,
            sampleProducts: await Product.find({ brand: /^Van/i }).limit(5).select('brand name published category').lean()
        };

        fs.writeFileSync('vancleef_check.json', JSON.stringify(results, null, 2));
        await mongoose.disconnect();
        console.log('Results written to vancleef_check.json');
    } catch (error) {
        console.error('Error:', error);
    }
}

findVanCleef();
