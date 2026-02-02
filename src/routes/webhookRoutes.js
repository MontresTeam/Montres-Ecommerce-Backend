const express = require("express");
const { handleStripeWebhook } = require("../controllers/webhoockController");

const router = express.Router();

// Stripe needs raw body for signature verification
// We apply express.raw() only to this route
router.post(
    "/stripe",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
);

// Tabby Webhook (Raw body for secure signature)
const { handleWebhook: handleTabbyWebhook } = require("../controllers/tabbyController");
router.post(
    "/tabby",
    express.raw({ type: "application/json" }),
    handleTabbyWebhook
);

module.exports = router;
