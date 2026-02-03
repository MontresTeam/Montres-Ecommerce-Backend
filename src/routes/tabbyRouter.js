const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { preScoring, createSession } = require('../controllers/tabbyController');

router.post('/pre-scoring', protect, preScoring);
router.post('/create-session', protect, createSession);


module.exports = router;

