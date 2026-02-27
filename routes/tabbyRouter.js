const express = require('express');
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const {
    preScoring,
    createTabbyOrder,

} = require('../controllers/tabbyController');

// Standardized routes
router.post('/pre-scoring', preScoring);
router.post('/create-checkout', createTabbyOrder);


module.exports = router;
