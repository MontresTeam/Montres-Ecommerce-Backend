const express = require("express");
const router = express.Router();
const { saveShippingAddress, getShippingAddress, getBillingAddress, saveBillingAddress } = require("../controllers/addressController");
const { protect } = require("../middlewares/authMiddleware");

// POST /api/address/shipping
router.post("/shipping", protect, saveShippingAddress);

// GET /api/address/shipping (Optional but good to have)
router.get("/shipping", protect, getShippingAddress);

// Billing
router.get("/billing", protect, getBillingAddress);
router.post("/billing", protect, saveBillingAddress);
module.exports = router;
