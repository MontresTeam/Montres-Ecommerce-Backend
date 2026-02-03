const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // link to User
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    country: { type: String, default: "AE" },
    address: { type: String },
    profilePicture: { type: String },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const ProfileModal = mongoose.model("Profile", profileSchema);

module.exports = ProfileModal;
