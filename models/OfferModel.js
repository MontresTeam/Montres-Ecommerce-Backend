const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: false, // Optional for manual offers where product might be deleted or just text
        },
        productName: {
            type: String,
            required: true,
        },
        customerName: {
            type: String,
            required: true,
        },
        customerEmail: {
            type: String,
            required: true,
        },
        originalPrice: {
            type: Number,
            required: true,
        },
        offeredPrice: {
            type: Number,
            required: true,
        },
        token: {
            type: String,
            unique: true,
            sparse: true, // Only for tokens that exist
        },
        expiresAt: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected", "countered", "expired", "used"],
            default: "pending",
        },
        message: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Offer", offerSchema);
