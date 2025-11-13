const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
  createStripeOrder,
  getOrderById,
  getAllOrders,
  getMyOrders,
  getShippingAddresses,
  createTabbyOrder,
} = require("../controllers/orderController");

// ✅ Place this route BEFORE /:id
router.get("/myorders", protect, getMyOrders);

// Example: get all orders
router.get("/", getAllOrders);
// Specific routes FIRST
router.post("/create", protect, createStripeOrder);
router.get("/shipping-addresses", getShippingAddresses);

router.post("/Tabby", createTabbyOrder);

// Dynamic route LAST
router.get("/:id", getOrderById);

module.exports = router;
