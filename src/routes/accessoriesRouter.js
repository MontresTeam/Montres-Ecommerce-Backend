const express = require("express");

const {getAccessoriesProducts, createAccessory, updateAccessory} =require('../controllers/accessoriesController');
const addProductImageUpload = require("../config/addProductImageUpload");
const updateProductImageUpload = require("../config/updateProductImageUpload");
const router = express.Router();    
// ✅ Correct route
router.get("/category/:category", getAccessoriesProducts); 
router.post("/createAccessory",addProductImageUpload,createAccessory)
router.put("/UpdatedAccessories/:id",updateProductImageUpload,updateAccessory)

module.exports = router;