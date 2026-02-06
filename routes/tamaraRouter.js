const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { createTamaraOrder } = require("../controllers/tamaraController");

router.post("/create-checkout", protect, createTamaraOrder);

module.exports = router;