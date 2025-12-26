const ProfileModal = require("../models/userProfileModal");

const createUserProfile = async (req, res) => {
  try {
    const { userId } = req.user; // comes from protected auth middleware

    // Check if profile exists
    const existingProfile = await ProfileModal.findById(userId);
    if (existingProfile) {
      return res.status(409).json({ message: "Profile already exists — use update" });
    }

    const { name, email, phone, country, address, profilePicture } = req.body;

    if (!name || !email || !address) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const profile = await ProfileModal.create({
      _id: userId,
      name,
      email,
      phone,
      country,
      address,
      profilePicture,
    });

    return res.status(201).json({ message: "Profile created successfully", user: profile });
  } catch (err) {
    console.error("Profile create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const profile = await ProfileModal.findById(userId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({ message: "Profile fetched successfully", user: profile });
  } catch (err) {
    console.error("Get profile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
   createUserProfile,
   getUserProfile
   };
