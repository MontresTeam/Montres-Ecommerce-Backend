const express = require("express");

const {getLetherProducts} =require('../controllers/leathersController')
const router = express.Router();    
// ✅ Correct route
router.get("/category/:category", getLetherProducts); 

module.exports = router;