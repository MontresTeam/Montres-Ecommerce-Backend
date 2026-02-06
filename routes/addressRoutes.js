const express = require("express");
const router = express.Router();
const {
    getShippingAddresses,
    createShippingAddress,
    deleteShippingAddress,
    updateShippingAddress,
    getBillingAddresses,
    createBillingAddress,
    deleteBillingAddress,
    updateBillingAddress,
} = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

// Shipping Address Routes
router.get("/shipping", protect, getShippingAddresses);
router.post("/shipping", protect, createShippingAddress);
router.delete("/shipping/:id", protect, deleteShippingAddress);
router.put("/shipping-address/:id", protect, updateShippingAddress);

// Billing Address Routes
router.get("/billing", protect, getBillingAddresses);
router.post("/billing", protect, createBillingAddress);
router.delete("/billing/:id", protect, deleteBillingAddress);
router.put("/billing-address/:id", protect, updateBillingAddress);

module.exports = router;
