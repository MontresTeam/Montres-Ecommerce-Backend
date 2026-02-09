const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { preScoring, createTabbyOrder, handleWebhook } = require('../controllers/tabbyController');

// Standardized routes
router.post('/pre-scoring', protect, preScoring);
router.post('/create-checkout', protect, createTabbyOrder);
router.post('/webhook', handleWebhook); // ✅ Added Webhook Route

module.exports = router;
