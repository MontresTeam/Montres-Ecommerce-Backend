const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },               // Product name
    brand: { type: String },                               // Brand name, e.g., Cartier
    model: { type: String },                               // Model, e.g., Ronde Solo
    referenceNo: { type: String },                         // Reference number
    category: { type: String, enum: ['watch', 'bag'], required: true },
    price: { type: Number, required: true },               // Current price (can be sale price)
    regularPrice: { type: Number },                        // Original price
    salePrice: { type: Number },                           // Discounted price (optional)
    description: { type: String },                         // General description
    specifications: {                                      // Watch / Bag specifications
        caseDiameter: { type: String },
        movement: { type: String },
        dial: { type: String },
        wristSize: { type: String },
        accessories: { type: String },
        condition: { type: String },
        productionYear: { type: Number }
    },
    image: { type: String },                             // Main image URL
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MainProduct', ProductSchema);
