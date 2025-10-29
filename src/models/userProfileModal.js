// models/ProfileModel.js
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  address: { type: String },
  profileImage: { type: String },
  country: { type: String, default: "UAE" },
});

const ProfileModal = mongoose.model("Profile", profileSchema);

module.exports = ProfileModal;
