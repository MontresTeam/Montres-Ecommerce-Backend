const express = require("express");
const { handleStripeWebhook } = require("../controllers/webhoockController");
const { handleWebhook: handleTabbyWebhook } = require("../controllers/tabbyController");

const router = express.Router();

// Stripe needs raw body for signature verification
// Path: /api/webhook/stripe
router.post(
    "/webhook/stripe",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
);

// Tabby Webhook (Raw body for secure signature)
// Path: /api/tabby/webhook
router.post(
    "/tabby/webhook",
    express.raw({ type: "application/json" }),
    handleTabbyWebhook
);

module.exports = router;
