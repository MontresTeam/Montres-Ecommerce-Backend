const express = require("express");

const {
  Registration,
  Login,
  forgotPassword,
  ResetPassword,
  convertprice,
  logout,
  refreshToken,
} = require("../controllers/userController");

const router = express.Router();

// ✅ Correct routes
router.post("/register", Registration);

router.post("/refresh-token", refreshToken);

// router.post("/logout",logout)

router.post("/login", Login);
// 🔑 Forgot Password (send reset link to email)
router.post("/forgot-password", forgotPassword);
// 🔑 Reset Password (update with new password)
router.post("/reset-password/:id/:token", ResetPassword);

router.get("/convert-price", convertprice);

router.post("/logout", logout);

module.exports = router;
