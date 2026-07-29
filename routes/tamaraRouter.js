const express = require("express");
const router = express.Router();
const { optionalProtect } = require("../middlewares/authMiddleware");
const { createTamaraOrder } = require("../controllers/tamaraController");

router.post("/create-checkout", optionalProtect, createTamaraOrder);

module.exports = router;