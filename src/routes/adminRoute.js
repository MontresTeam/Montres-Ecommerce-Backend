const express = require("express");
const router = express.Router();
const { adminlogin } = require("../controllers/adminController");
const uploadAdminProfile = require("../config/adminProfileUpload");

// POST /admin/login
// Optional profile upload included
router.post("/login", uploadAdminProfile, adminlogin);

module.exports = router;
