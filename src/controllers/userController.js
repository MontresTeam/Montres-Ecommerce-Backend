const userModel = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ User Registration
const Registration = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ✅ Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        status: "Fail",
        message: "All fields (name, email, password) are required.",
      });
    }

    // ✅ Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "Fail",
        message: "Email already registered.",
      });
    }

    // ✅ Create new user (password is hashed in UserModel pre-save middleware)
    const newUser = await userModel.create({ name, email, password });

    res.status(201).json({
      status: "Success",
      message: "User registration successful 😊",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
};

// ✅ User Login
const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation
    if (!email || !password) {
      return res.status(400).json({
        status: "Fail",
        message: "Email and password are required.",
      });
    }

    // ✅ Check if user exists
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "Fail",
        message: "User not found.",
      });
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: "Fail",
        message: "Invalid credentials.",
      });
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.USER_ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      status: "Success",
      message: "Login successful 🎉",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
};

module.exports = { Registration, Login };
