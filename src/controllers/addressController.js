const User = require("../models/UserModel");

const saveShippingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
        firstName,
      lastName,
      phone,
      email,
      country,
      state,
      city,
      street,
      postalCode,
    } = req.body;
    
    console.log(userId,'user id',req.user.userId);
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.shippingAddress = {
      firstName,
      lastName,
      phone,
      email,
      country,
      state,
      city,
      street,
      postalCode,
    };

    await user.save();

    res.status(200).json({
      message: "Shipping address updated successfully",
      shippingAddress: user.shippingAddress,
    });
  } catch (error) {
    console.error("Save Address Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

const getShippingAddress = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({message: "User not found"});

        res.status(200).json({
            message: "Address fetched",
            shippingAddress: user.shippingAddress || {}
        });
    } catch (error) {
        console.error("Get Address Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
}

module.exports = { saveShippingAddress, getShippingAddress };
