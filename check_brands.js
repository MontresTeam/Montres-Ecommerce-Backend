const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Product = require('./models/product');

async function checkBrands() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const allBrands = await Product.aggregate([
            {
                $group: {
                    _id: { $toLower: { $trim: { input: "$brand" } } },
                    totalProducts: { $sum: 1 },
                    publishedCount: { $sum: { $cond: ["$published", 1, 0] } },
                    availableCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        "$published",
                                        {
                                            $or: [
                                                { $gt: ["$stockQuantity", 0] },
                                                { $eq: ["$inStock", true] }
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        console.log('Brand Summary:');
        console.log('ID | Total | Published | Available');
        console.log('-----------------------------------');
        allBrands.forEach(b => {
            console.log(`${(b._id || 'N/A').padEnd(15)} | ${String(b.totalProducts).padEnd(5)} | ${String(b.publishedCount).padEnd(9)} | ${b.availableCount}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkBrands();
