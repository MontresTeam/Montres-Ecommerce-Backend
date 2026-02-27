const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./models/product');

async function checkRolex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ brand: /rolex/i }).limit(5).lean();
        fs.writeFileSync('db_check.json', JSON.stringify(products, null, 2));
        await mongoose.disconnect();
    } catch (error) {
        fs.writeFileSync('db_check.json', JSON.stringify({ error: error.message }));
    }
}

checkRolex();
