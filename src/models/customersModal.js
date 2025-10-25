const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    serialNumber: {
      type: Number,
      required: true,
      unique: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    designation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
