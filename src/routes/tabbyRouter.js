const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { preScoring, createSession, createTabbyOrder } = require('../controllers/tabbyController');

router.post('/pre-scoring', protect, preScoring);

router.post('/check-eligibility', protect, preScoring);
router.post('/create-session', protect, createSession);
router.post('/create-checkout', protect, createTabbyOrder);



module.exports = router;
