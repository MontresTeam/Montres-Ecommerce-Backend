const express = require("express");
const { Registration, Login, forgotPassword } = require("../controllers/userController");

const router = express.Router();

// ✅ Correct routes
router.post("/register", Registration);
router.post("/login", Login);
router.post("/forgot-password",forgotPassword)

module.exports = router;
