const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Product = require('../models/product');

async function fixSlugs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const updates = [
            {
                id: '69e796f8026df198fe5b4215',
                slug: 'st-dupont-libert-ballpoint-pen-black-lacquer-palladium'
            },
            {
                id: '69e78eff026df198fe5b413d',
                slug: 'alfred-dunhill-dunhill-pen'
            }
        ];

        for (const update of updates) {
            const result = await Product.findByIdAndUpdate(update.id, { slug: update.slug }, { new: true });
            if (result) {
                console.log(`Updated product ${update.id}:`);
                console.log(`  Name: ${result.name}`);
                console.log(`  New Slug: ${result.slug}`);
            } else {
                console.log(`Product ${update.id} NOT found.`);
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

fixSlugs();
