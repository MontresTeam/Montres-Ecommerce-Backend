const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Assuming you already have a Product schema
const Product = require("./product"); // your Product model

// Schema for Heading
const homeProductsGridSchema = new Schema({
  category: {
    type: String,
    required: true,
  },
  products: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", 
    },
  ],
});

// Add a validator to ensure max 3 products
homeProductsGridSchema.path("products").validate(function (value) {
  return value.length <= 3;
}, "You can add up to 3 products only");

// Create the Heading model
module.exports = mongoose.model("homeProductsGrid", homeProductsGridSchema, "homeProductsGrid");
