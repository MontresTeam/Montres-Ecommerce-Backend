const express = require('express');
const router = express.Router();
const cartController = require('../controllers/orderController');
const auth = require('../middleware/auth');

router.post('/calculate-shipping', auth, cartController.calculateShipping);
router.post('/create-order', auth, cartController.createOrder);

module.exports = router;