const express = require("express");
const { handleStripeWebhook } = require("../controllers/webhoockController");
const { handleTamaraWebhook } = require("../controllers/tamaraController");
const { handleTabbyWebhook } = require("../controllers/tabbyController");

const router = express.Router();

// Stripe needs raw body for signature verification
// Path: /api/webhook/stripe
router.post(
    ["/webhook/stripe", "/stripe/webhook"],
    express.raw({ type: "application/json" }),
    handleStripeWebhook
);

// Tabby Webhook (Raw body for secure signature)
// Path: /api/tabby/webhook or /api/webhook/tabby
router.post(
    ["/tabby/webhook", "/webhook/tabby"],
    express.raw({ type: "application/json" }),
    handleTabbyWebhook
);

// Tamara Webhook (Raw body for secure signature)
// Path: /api/webhook/tamara or /api/tamara/webhook
router.post(
    ["/webhook/tamara", "/tamara/webhook"],
    express.raw({ type: "application/json" }),
    handleTamaraWebhook
);

module.exports = router;
