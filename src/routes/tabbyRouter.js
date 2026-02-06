const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { preScoring, createSession, createTabbyOrder } = require('../controllers/tabbyController');

router.post('/pre-scoring', protect, preScoring);
<<<<<<< HEAD
router.post('/check-eligibility', protect, preScoring);
router.post('/create-session', protect, createSession);
router.post('/create-checkout', protect, createSession);
=======
router.post('/create-checkout', protect, createTabbyOrder);
router.post('/create-session', protect, createSession); // This seems redundant with create-checkout but keeping for compatibility

>>>>>>> be3e03b6c15c90affb9870efb8b42a550b533846

module.exports = router;

