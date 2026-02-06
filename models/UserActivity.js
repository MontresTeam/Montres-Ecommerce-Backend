// models/UserActivity.js
const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },

  viewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  viewedCategories: [{ type: String }],

  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  cartItems: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  lastViewedCategory: { type: String },
  averagePriceSeen: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('UserActivity', userActivitySchema);
