const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { createTamaraOrder, verifyTamaraPayment } = require("../controllers/tamaraController");

router.post("/create-checkout", protect, createTamaraOrder);
router.get("/verify-payment", verifyTamaraPayment); // Note: No 'protect' here so redirected users can call it easily, OR keep protect if you prefer JWT.

module.exports = router;
