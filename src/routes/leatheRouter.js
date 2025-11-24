const express = require("express");

const {getLetherProducts, updateLeathergoods} =require('../controllers/leathersController');
const addProductImageUpload = require("../config/addProductImageUpload");
const { addLeathergoods } = require("../controllers/leathersController");
const updateProductImageUpload = require("../config/updateProductImageUpload");
const router = express.Router();    
// ✅ Correct route
router.get("/category/:category", getLetherProducts); 
router.post("/Add",addProductImageUpload,addLeathergoods)
router.put('/Updateleather/:id',updateProductImageUpload, updateLeathergoods);


module.exports = router;