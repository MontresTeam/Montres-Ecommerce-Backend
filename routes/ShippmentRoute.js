const express = require("express");
const router = express.Router();
const {
  createDHLShipmentFromOrder,
  getShipmentByOrder,
  downloadShipmentLabel
} = require("../controllers/DHLShippmentController");
const { adminProtect } = require("../middlewares/authMiddleware");

// Create DHL shipment manually from an order
router.post("/create-from-order/:orderId", adminProtect, createDHLShipmentFromOrder);

// Get shipment details (tracking number, documents) for a given order
router.get("/by-order/:orderId", adminProtect, getShipmentByOrder);

// Download / stream the shipping label PDF for a given order
router.get("/label/:orderId", adminProtect, downloadShipmentLabel);

module.exports = router;
