const express = require("express");
const {
  Registration,
  Login,
  forgotPassword,
  ResetPassword,
  convertprice,
  logout,
  currencyConver,
  RefreshToken,
  googleLogin,
  googleSignup,
  facebookSignup,
} = require("../controllers/userController");
const imageUploadUpdate = require("../config/ProfileUploadin");
const {
  createUserProfile,
  getUserProfile,
} = require("../controllers/userProfileController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// ✅ Correct routes
router.post("/register", Registration);

router.post("/refresh-token", RefreshToken);

// router.post("/logout",logout)

router.post("/login", Login);

router.post("/google-signup",googleSignup)
router.post("/facebook-signup",facebookSignup)
// 🔑 Forgot Password (send reset link to email)
router.post("/forgot-password", forgotPassword);
// 🔑 Reset Password (update with new password)
router.post("/reset-password/:id/:token", ResetPassword);

router.get("/convert-price", convertprice);

router.get("/CurrencyAPI", currencyConver);

router.post("/logout", logout);

router.post("/profile/create", protect, imageUploadUpdate, createUserProfile);
router.get("/profile/get", protect, getUserProfile);


module.exports = router;
