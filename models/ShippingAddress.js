const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
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
      match: /^[+]?[\d\s\-()]+$/ // regex pattern for phone numbers
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: /^\S+@\S+\.\S+$/ // basic email validation
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
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
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
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

// Optional: prevent duplicate addresses per user
addressSchema.index(
  { userId: 1, address1: 1, city: 1, country: 1, phone: 1 },
  { unique: true }
);

module.exports = mongoose.model("Address", addressSchema);
