// models/RestockSubscription.js
const mongoose = require("mongoose");

const restockSubscriptionSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product", 
    required: true 
  },

  productName: { 
    type: String, 
    required: true 
  },   // Product title

  category: { 
    type: String 
  },    // Product category

  email: { 
    type: String, 
    required: true 
  },

  status: { 
    type: String, 
    enum: ["pending", "notified"], 
    default: "pending" 
  },  // pending or notified

  notified: { 
    type: Boolean, 
    default: false 
  },  // Has the notification been sent?

  createdAt: { 
    type: Date, 
    default: Date.now 
  }   // Subscription date
});

module.exports = mongoose.model(
  "RestockSubscription",
  restockSubscriptionSchema
);
