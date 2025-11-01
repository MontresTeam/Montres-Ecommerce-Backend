const express = require("express");
const passport = require("passport");
const {
  Registration,
  Login,
  forgotPassword,
  ResetPassword,
  convertprice,
  logout,
  refreshToken,
  googleLogin,
  facebookLogin,
} = require("../controllers/userController");
const imageUploadUpdate = require("../config/ProfileUploadin");
const { updateUserProfile } = require("../controllers/userProfileController");
const {protect} = require('../middlewares/authMiddleware')

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

router.put("/profile",protect,imageUploadUpdate,updateUserProfile)


// ✅ Step 1: Redirect to Google for authentication
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// ✅ Step 2: Handle callback from Google
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login" }),
  googleLogin
);

// Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback", passport.authenticate("facebook", { session: false }), facebookLogin);


module.exports = router;
