const express = require("express");

const {getAccessoriesProducts, Addaccessories, updateAccessories} =require('../controllers/accessoriesController');
const addProductImageUpload = require("../config/addProductImageUpload");
const updateProductImageUpload = require("../config/updateProductImageUpload");
const router = express.Router();    
// ✅ Correct route
router.get("/category/:category", getAccessoriesProducts); 
router.post("/Add",addProductImageUpload,Addaccessories)
router.put("/UpdatedAccessories/:id",updateProductImageUpload,updateAccessories)

module.exports = router;