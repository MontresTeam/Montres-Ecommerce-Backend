const express = require('express');
const router = express.Router();
const { preScoring, createSession } = require('../controllers/tabbyController');

router.post('/pre-scoring', preScoring);
router.post('/create-session', createSession);



module.exports = router;