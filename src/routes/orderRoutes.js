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
  createShippingAddress,
  deleteShippingAddress,
  getBillingAddresses,
  createBillingAddress,
  deleteBillingAddress,
} = require("../controllers/orderController");

// ✅ Place this route BEFORE /:id
router.get("/myorders", protect, getMyOrders);

router.post("/tabby", createTabbyOrder);

router.post("/tamara/create-checkout",protect,createTamaraOrder)

// Shipping
router.get("/shipping", protect, getShippingAddresses);
router.post("/shipping", protect, createShippingAddress);
router.delete("/shipping/:id", protect, deleteShippingAddress);

// Billing
router.get("/billing", protect, getBillingAddresses);
router.post("/billing", protect, createBillingAddress);
router.delete("/billing/:id", protect, deleteBillingAddress);


router.get("/", getAllOrders);
// Specific routes FIRST
router.post("/stripe/create-checkout", protect, createStripeOrder);

// Dynamic route LAST
router.get("/:id", getOrderById);

module.exports = router;
