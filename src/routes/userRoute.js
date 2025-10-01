const express = require("express");
const { Registration, Login, forgotPassword, ResetPassword, convertprice} = require("../controllers/userController");

const router = express.Router();

// ✅ Correct routes
router.post("/register", Registration);
router.post("/login", Login);
// 🔑 Forgot Password (send reset link to email)
router.post("/forgot-password",forgotPassword)
// 🔑 Reset Password (update with new password)
router.post("/reset-password/:id/:token", ResetPassword);

router.get("/convert-price",convertprice)


module.exports = router;
