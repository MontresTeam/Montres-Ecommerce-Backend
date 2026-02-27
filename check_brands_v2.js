const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./models/product');

async function checkSpecificBrands() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const brandsToCheck = [
            { name: 'Hermes', query: /herm[eè]s/i },
            { name: 'Van Cleef & Arpels', query: /van cleef/i },
            { name: 'Baume & Mercier', query: /baume/i }
        ];

        const results = {};

        for (const brand of brandsToCheck) {
            const count = await Product.countDocuments({
                brand: brand.query,
                published: true,
                category: 'Watch'
            });
            const allProducts = await Product.find({ brand: brand.query }).select('brand category published').limit(5).lean();
            results[brand.name] = {
                activeWatchCount: count,
                sampleProducts: allProducts
            };
        }

        fs.writeFileSync('brand_check_results.json', JSON.stringify(results, null, 2));
        await mongoose.disconnect();
        console.log('Results written to brand_check_results.json');
    } catch (error) {
        console.error('Error:', error);
    }
}

checkSpecificBrands();
