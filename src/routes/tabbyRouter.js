const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { preScoring, createSession, createTabbyOrder } = require('../controllers/tabbyController');

router.post('/pre-scoring', protect, preScoring);
router.post('/create-checkout', protect, createTabbyOrder);
router.post('/create-session', protect, createSession); // This seems redundant with create-checkout but keeping for compatibility


module.exports = router;

