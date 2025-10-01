const express = require("express");

const {getAccessoriesProducts} =require('../controllers/accessoriesController')
const router = express.Router();    
// ✅ Correct route
router.get("/category/:category", getAccessoriesProducts); 

module.exports = router;