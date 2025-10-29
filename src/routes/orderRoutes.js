const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  createStripeOrder,
  getOrderById,
  getAllOrders,
  getMyOrders,
  getShippingAddresses,
} = require("../controllers/orderController");

// ✅ Place this route BEFORE /:id
router.get("/myorders", protect, getMyOrders);

// Example: get all orders
router.get("/", getAllOrders);

// ✅ Keep this LAST
router.get("/:id", getOrderById);

// Optional additional routes
router.post("/create", protect, createStripeOrder);
router.get("/shipping/addresses", getShippingAddresses);

module.exports = router;
