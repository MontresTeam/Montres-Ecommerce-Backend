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
      address1,
      address2,
      postalCode,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.shippingAddress = {
      firstName,
      lastName,
      phone,
      email,
      country,
      state,
      city,
      street: address1 + (address2 ? `, ${address2}` : ""),
      postalCode,
      address1,
      address2,
    };

    await user.save();

    // Add virtual _id for frontend compatibility
    const responseAddress = {
      ...user.shippingAddress.toObject(),
      _id: "default-shipping",
    };

    res.status(200).json({
      success: true,
      message: "Shipping address updated successfully",
      address: responseAddress,
      shippingAddress: responseAddress,
    });
  } catch (error) {
    console.error("Save Address Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const getShippingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let responseAddress = null;
    if (user.shippingAddress && user.shippingAddress.firstName) {
      responseAddress = {
        ...user.shippingAddress.toObject(),
        _id: "default-shipping",
      };
    }

    res.status(200).json({
      success: true,
      message: "Address fetched",
      shippingAddress: responseAddress || {},
    });
  } catch (error) {
    console.error("Get Address Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const saveBillingAddress = async (req, res) => {
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
      address1,
      address2,
      postalCode,
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.billingAddress = {
      firstName,
      lastName,
      phone,
      email,
      country,
      state,
      city,
      street: address1 + (address2 ? `, ${address2}` : ""),
      postalCode,
      address1,
      address2,
    };

    await user.save();

    const responseAddress = {
      ...user.billingAddress.toObject(),
      _id: "default-billing",
    };

    res.status(200).json({
      success: true,
      message: "Billing address updated successfully",
      address: responseAddress,
      billingAddress: responseAddress,
    });
  } catch (error) {
    console.error("Save Billing Address Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

const getBillingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let responseAddress = null;
    if (user.billingAddress && user.billingAddress.firstName) {
      responseAddress = {
        ...user.billingAddress.toObject(),
        _id: "default-billing",
      };
    }

    res.status(200).json({
      success: true,
      message: "Billing address fetched",
      billingAddress: responseAddress || {},
    });
  } catch (error) {
    console.error("Get Billing Address Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

module.exports = {
  saveShippingAddress,
  getShippingAddress,
  saveBillingAddress,
  getBillingAddress,
};

