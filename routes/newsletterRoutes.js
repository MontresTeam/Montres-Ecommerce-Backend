const express = require("express");
const router = express.Router();
const newsletterController = require("../controllers/newsletterController");

// @route   POST /api/newsletter/subscribe
// @desc    Subscribe a user to the Klaviyo newsletter list
// @access  Public
router.post("/subscribe", newsletterController.subscribeToNewsletter);

module.exports = router;
