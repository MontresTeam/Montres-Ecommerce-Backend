const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { preScoring } = require("../controllers/tabbyController");

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
  updateBillingAddress,
  updateShippingAddress,
} = require("../controllers/orderController");

// ✅ Place this route BEFORE /:id
router.get("/myorders", protect, getMyOrders);


router.post("/tabby/create-tabbycheckout", protect, createTabbyOrder);
router.post("/tabby/check-eligibility", protect, preScoring);


router.post("/tamara/create-checkout", protect, createTamaraOrder)
// Specific routes FIRST
router.post("/stripe/create-checkout", protect, createStripeOrder);


// Shipping
router.get("/shipping", protect, getShippingAddresses);
router.post("/shipping", protect, createShippingAddress);
router.delete("/shipping/:id", protect, deleteShippingAddress);
router.put("/shipping-address/:id", protect, updateShippingAddress)

// Billing
router.get("/billing", protect, getBillingAddresses);
router.post("/billing", protect, createBillingAddress);
router.delete("/billing/:id", protect, deleteBillingAddress);
router.put("/billing-address/:id", protect, updateBillingAddress)



router.get("/", getAllOrders);


// Dynamic route LAST
router.get("/:id", getOrderById);

module.exports = router;
