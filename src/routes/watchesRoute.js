const express = require("express");
const { getWatches } = require("../controllers/watchesController");

const router = express.Router();    
// ✅ Correct route
router.get("/category/:category", getWatches); 

module.exports = router;