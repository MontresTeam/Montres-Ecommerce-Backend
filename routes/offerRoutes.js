const express = require("express");
const {
    createOffer,
    getOffers,
    updateOfferStatus,
    deleteOffer,
    verifyOfferToken,
} = require("../controllers/offerController");
const { adminProtect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Public routes
router.post("/submit", createOffer);
router.get("/verify/:token", verifyOfferToken);

// Admin routes (Protected)
router.get("/all", adminProtect, getOffers);
router.patch("/status/:id", adminProtect, updateOfferStatus);
router.delete("/:id", adminProtect, deleteOffer);

module.exports = router;
