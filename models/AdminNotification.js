const mongoose = require("mongoose");

const adminNotificationSchema = new mongoose.Schema(
    {
        adminEmail: {
            type: String,
            default: "farhan.dev24@gmail.com",
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        offerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Offer",
        },
        read: {
            type: Boolean,
            default: false,
        },
        actionLink: {
            type: String, // Quick action links (View Offer / Counter / Accept)
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("AdminNotification", adminNotificationSchema);
