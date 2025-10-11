// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const { createOrder, getOrderById, getMyOrders, getShippingAddresses, calculateShipping } = require("../controllers/orderController");
const { protect } = require("../middlewares/authMiddleware"); // optional

// Create order (open route or protected)
router.post("/", protect, createOrder);

router.get("/shipping-addresses",protect, getShippingAddresses);


// Get a single order
router.get("/:id", protect, getOrderById);

// Get current user's orders
router.get("/", protect, getMyOrders);

module.exports = router;
