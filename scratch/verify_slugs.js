const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/product');

async function verifySlugs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const slugsToVerify = [
            'st-dupont-libert-ballpoint-pen-black-lacquer-palladium',
            'alfred-dunhill-dunhill-pen'
        ];

        for (const slug of slugsToVerify) {
            const product = await Product.findOne({ slug: slug, published: true });
            if (product) {
                console.log(`✅ SUCCESS: Found product for slug "${slug}"`);
                console.log(`   ID: ${product._id}`);
                console.log(`   Name: ${product.name}`);
            } else {
                console.log(`❌ FAILURE: Product NOT found for slug "${slug}"`);
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

verifySlugs();
