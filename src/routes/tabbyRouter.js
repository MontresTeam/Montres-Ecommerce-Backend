const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { preScoring, createSession, createTabbyOrder } = require('../controllers/tabbyController');

router.post('/pre-scoring', preScoring);
router.post('/check-eligibility', preScoring);
router.post('/create-session', createSession);
router.post('/create-checkout', createTabbyOrder);



module.exports = router;
