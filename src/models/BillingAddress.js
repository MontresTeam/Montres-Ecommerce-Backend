const mongoose = require("mongoose");

const billingAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: /^[+]?[\d\s\-()]+$/ // phone number pattern
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/ // email validation
    },
    address1: {
      type: String,
      required: true,
      trim: true
    },
    address2: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ["home", "work", "other"],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Optional: prevent duplicate billing addresses per user
billingAddressSchema.index(
  { userId: 1, address1: 1, city: 1, country: 1, phone: 1 },
  { unique: true }
);

module.exports = mongoose.model("BillingAddress", billingAddressSchema);
