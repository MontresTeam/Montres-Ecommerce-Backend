const express = require("express");
const { handleStripeWebhook, handleTamaraWebhook } = require("../controllers/webhoockController");
const { handleTabbyWebhook } = require("../controllers/tabbyController");

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

// Tamara Webhook (Raw body for secure signature)
// Path: /api/webhook/tamara
router.post(
    "/webhook/tamara",
    express.raw({ type: "application/json" }),
    handleTamaraWebhook
);

module.exports = router;
