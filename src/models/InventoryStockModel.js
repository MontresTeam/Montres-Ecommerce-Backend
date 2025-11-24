const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
brand: { type: String },
internalCode: { type: String },
quantity: { type: Number },
status: { type: String },
cost: { type: Number },
sellingPrice: { type: Number },
soldPrice: { type: Number },
paymentMethod: { type: String },
receivingAmount: { type: Number }

}, { timestamps: true });

module.exports = mongoose.model('InventoryStock', ProductSchema);
