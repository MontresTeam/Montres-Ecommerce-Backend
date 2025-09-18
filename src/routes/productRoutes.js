const express = require("express");
const { getProducts, addProduct } = require("../controllers/productController");
const ImageUpload = require('../config/multerConfig');

const router = express.Router();

// Routes
router.get("/", getProducts);           // Fetch all products
router.post("/", ImageUpload, addProduct); // Add a new product with image upload

module.exports = router;
