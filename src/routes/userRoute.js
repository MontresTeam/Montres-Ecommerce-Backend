const express = require("express");
const { Registration, Login } = require("../controllers/userController");

const router = express.Router();

// ✅ Correct routes
router.post("/register", Registration);
router.post("/login", Login);

module.exports = router;
