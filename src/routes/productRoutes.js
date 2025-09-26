const express = require("express");

const { getProducts, addProduct,addServiceForm,productHome } = require("../controllers/productController");



const ImageUpload = require('../config/multerConfig');

const router = express.Router();

// Routes
router.get("/", getProducts);           // Fetch all products
router.post("/", ImageUpload, addProduct); // Add a new product with image upload
router.post("/createBooking",ImageUpload,addServiceForm) // create a Watch service Form
router.get("/home",productHome) // Fetch products for home page

module.exports = router;
