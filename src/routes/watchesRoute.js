// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const { getWatchesByStyle, getAllWatches } = require("../controllers/watchesController");

// Fetch all watches
router.get("/all", getAllWatches);

// Fetch watches by style
router.get("/style/:style", getWatchesByStyle);

module.exports = router;
