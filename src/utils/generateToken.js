// utils/generateToken.js
const jwt = require("jsonwebtoken");

exports.generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.USER_ACCESS_TOKEN_SECRET, {
    expiresIn: "2h", // ⏱️ short lifespan
  });
};

exports.generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.USER_REFRESH_TOKEN_SECRET, {
    expiresIn: "7d", // 🔁 lasts 7 days
  });
};
