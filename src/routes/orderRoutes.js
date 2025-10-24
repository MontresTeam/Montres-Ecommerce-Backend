// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const {
  getOrderById,
  getMyOrders,
  getShippingAddresses,
  createStripeOrder,
  createTabbyOrder,
  getAllOrders,
} = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware");

router.post("/", protect, createStripeOrder);

router.post("/tabby/", createTabbyOrder);

router.get("/shipping-addresses", protect, getShippingAddresses);

router.get("/:id",  getOrderById);

router.get("/", getAllOrders);

module.exports = router;
