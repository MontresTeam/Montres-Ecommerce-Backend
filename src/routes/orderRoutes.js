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
  createTamaraOrder,
} = require("../controllers/orderController");

// ✅ Place this route BEFORE /:id
router.get("/myorders", protect, getMyOrders);

router.post("/tabby", createTabbyOrder);

router.post("/tamara",createTamaraOrder)

router.get("/shipping-addresses", protect, getShippingAddresses);

router.get("/", getAllOrders);
// Specific routes FIRST
router.post("/create", protect, createStripeOrder);

// Dynamic route LAST
router.get("/:id", getOrderById);

module.exports = router;
