const express = require("express");
const { getProducts, addProduct,addServiceForm,productHome } = require("../controllers/productController");
const ImageUpload = require('../config/multerConfig');
const { addToCart, removeFromCart, addToWishlist, placeOrder, getMyOrders, removeFromWishlist } = require("../controllers/userController");
const { protect } = require("../middlewares/authMiddleware"); // JWT middleware
const router = express.Router();

// Routes
router.get("/", getProducts);           // Fetch all products
router.post("/", ImageUpload, addProduct); // Add a new product with image upload
router.post("/createBooking",ImageUpload,addServiceForm) // create a Watch service Form
router.get("/home",productHome) // Fetch products for home page
router.post("/cart/add",protect, addToCart) // add To Cart
router.delete("/cart/remove",protect, removeFromCart) // Remove from Cart
router.delete("/wishlist/remove",protect,removeFromWishlist)
router.post("/wishlist/add",protect, addToWishlist) // add To wishlist
router.post("/orders/place",placeOrder) // Place Order
router.get("/orders/my",getMyOrders) // My orders fething

module.exports = router;
