const express = require("express");
const {
    getAllBrands,
    getBrandDetails,
    getBrandsWithStats,
    getAvailableBrands
} = require("../controllers/brandController");

const router = express.Router();

/**
 * Brand Routes - GET operations only
 * All routes are public and don't require authentication
 */

// Get all brands (with optional category filter)
// Example: GET /api/brands?category=watches
router.get("/", getAllBrands);

// Get brands with detailed statistics
// Example: GET /api/brands/stats?category=bags
router.get("/stats", getBrandsWithStats);

// Get only available brands (brands with products in stock)
// Example: GET /api/brands/available?category=accessories
router.get("/available", getAvailableBrands);

// Get specific brand details
// Example: GET /api/brands/rolex?category=watches
router.get("/:brandName", getBrandDetails);

module.exports = router;
