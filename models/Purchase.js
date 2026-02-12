const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
    {
        product_name: {
            type: String,
            required: true,
            trim: true,
        },
        // Added fields for Inventory linking
        brand: {
            type: String,
            default: "Other",
        },
        category: {
            type: String,
            default: "Accessories",
        },
        quantity: {
            type: Number,
            default: 1,
        },
        addToInventory: {
            type: Boolean,
            default: true,
        },
        // End added fields
        purchase_amount: {
            type: Number,
            required: true,
            default: 0,
        },
        shipping_cost: {
            type: Number,
            default: 0,
        },
        total_cost: {
            type: Number,
            required: true,
            default: 0,
        },
        has_shipping: {
            type: Boolean,
            default: true,
        },
        shipping_date: {
            type: Date,
            default: null,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const Purchase = mongoose.model("Purchase", purchaseSchema);

module.exports = Purchase;
