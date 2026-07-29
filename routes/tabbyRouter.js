const express = require('express');
const router = express.Router();
const { optionalProtect } = require("../middlewares/authMiddleware");
const {
    preScoring,
    createTabbyOrder,
    syncTabbyOrders,
} = require('../controllers/tabbyController');

// Tabby routes — optionalProtect allows both logged-in and guest users.
// Logged-in users get req.user populated; guests proceed without a token.
router.post('/pre-scoring', optionalProtect, preScoring);
router.post('/create-checkout', optionalProtect, createTabbyOrder);
router.post('/session', optionalProtect, createTabbyOrder);
router.get('/sync', syncTabbyOrders); // New reconciliation route

module.exports = router;
