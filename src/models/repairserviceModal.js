const mongoose = require("mongoose");

const watchServiceSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    manufactureYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },
    watchType: {
      type: String,
      enum: [
        "Automatic",
        "Quartz",
        "Mechanical",
        "Chronograph",
        "Diver",
        "Pilot",
        "Dress",
        "Smartwatch",
        "Other",
      ],
    },
    selectedService: {
      type: String,
      required: true,
      enum: [
        "Battery Replacement",
        "Movement Service",
        "Crystal Replacement",
        "Band Adjustment",
        "Water Resistance Testing",
        "Cleaning & Polishing",
        "Dial Repair",
        "Vintage Restoration",
      ],
    },
    image: { type: String },        
  },
  { timestamps: true }
);

module.exports = mongoose.model("WatchService", watchServiceSchema);
