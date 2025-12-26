const express = require('express');
const router = express.Router();
const { preScoring, createSession, handleWebhook } = require('../controllers/tabbyController');

// ✅ Payment endpoints
// These will be mounted at / by server.js (or adapt logic below)
// If mounted at /, then:
router.post('/pre-scoring', preScoring);
router.post('/create-session', createSession);

// ✅ Webhook
router.post('/api/webhooks/tabby', handleWebhook);

module.exports = router;