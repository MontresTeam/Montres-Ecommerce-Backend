const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/product');

async function checkAccessories() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const accessories = await Product.find({ category: 'Accessories' });
        console.log(`Found ${accessories.length} accessories.`);

        console.log('\n--- Accessories with potential slug issues ---');
        accessories.forEach(p => {
            const expectedSlugBase = `${p.brand || ''} ${p.name || ''}`.trim().toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            
            if (p.slug !== expectedSlugBase && !p.slug.startsWith(expectedSlugBase)) {
                console.log(`Mismatch:`);
                console.log(`  ID: ${p._id}`);
                console.log(`  Brand: ${p.brand}`);
                console.log(`  Name: ${p.name}`);
                console.log(`  Current Slug: ${p.slug}`);
                console.log(`  Expected Slug: ${expectedSlugBase}`);
            }
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAccessories();
