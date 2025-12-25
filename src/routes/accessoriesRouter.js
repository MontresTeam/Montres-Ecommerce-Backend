// routes/accessoriesRoutes.js

const express = require("express");
const router = express.Router();

// Controllers
const {
  getAccessoriesProducts,
  createAccessory,
  updateAccessory,
  getAllAccessories,
} = require("../controllers/accessoriesController");

// Image Upload Middlewares
const addProductImageUpload = require("../config/addProductImageUpload");
const updateProductImageUpload = require("../config/updateProductImageUpload");

// ============================================
// ACCESSORIES ROUTES
// ============================================

// ✅ GET ALL ACCESSORIES (BY CATEGORY + QUERY FILTERS)
router.get("/category/:category", getAccessoriesProducts);

// ✅ CREATE ACCESSORY (WITH IMAGE UPLOAD)
router.post("/createAccessory", addProductImageUpload, createAccessory);

// ✅ UPDATE ACCESSORY (WITH IMAGE UPDATE)
router.put("/UpdatedAccessories/:id", updateProductImageUpload, updateAccessory);

router.get("/getAccessories",getAllAccessories)

// EXPORT ROUTER
module.exports = router;
