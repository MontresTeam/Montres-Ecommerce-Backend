// routes/recommendRoutes.js
const express = require('express');
const router = express.Router();
const recommendController = require('../controllers/recommendController');

// Guest users (no userId)
router.get('/just-for-you', recommendController.getJustForYou);

// Logged in users
router.get('/just-for-you/:userId', recommendController.getJustForYou);

module.exports = router;
