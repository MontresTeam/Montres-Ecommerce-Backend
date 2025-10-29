
const ProfileModal = require('../models/userProfileModal')


// Update User Profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // From JWT middleware (protect)
    const { phone, address, images } = req.body;

    // Find user
    const user = await ProfileModal.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (images) user.profileImage = images[0]?.url || user.profileImage; // Use first image as profile

    // Save updated user
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


module.exports = {updateUserProfile}