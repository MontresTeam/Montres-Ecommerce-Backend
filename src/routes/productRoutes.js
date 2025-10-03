const express = require("express");
const {
  getProducts,
  addProduct,
  addServiceForm,
  productHome,
  getAllProductwithSearch
} = require("../controllers/productController");
const {
  addToCart,
  removeFromCart,
  addToWishlist,
  removeFromWishlist,
  createWishlist,
  getWishlists,
  placeOrder,
  getMyOrders,
  Emptywishlist,
  Setdefaultwishlist,
  Deleteentirewishlist,
  getCart,
  updateCart,
  recommendationsProduct,
} = require("../controllers/userController");
const ImageUpload = require("../config/multerConfig");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

/* ----------------- Product Routes ----------------- */
router.get("/products", getProducts);                       // Fetch all products
router.post("/products", ImageUpload, addProduct);          // Add a new product
router.post("/products/createBooking", ImageUpload, addServiceForm); // Create service form
router.get("/products/home", productHome);                 // Products for homepage
router.get('/productall',getAllProductwithSearch)
/* ----------------- Cart Routes ----------------- */
router.post("/cart/add", protect, addToCart);    
router.get('/cart',protect,getCart)            // Add to cart
router.delete("/cart/remove", protect, removeFromCart);   // Remove from cart
router.put('/cart/update-cart',protect,updateCart)

/*------------------ Recommendations ----------------*/
router.get('/cart/recommendations',protect,recommendationsProduct)

/* ----------------- Wishlist Routes ----------------- */
router.post("/wishlist/add", protect, addToWishlist);       // Add to wishlist
router.delete("/wishlist/remove", protect, removeFromWishlist); // Remove from wishlist
router.post("/wishlist/create", protect, createWishlist);   // Create wishlist
router.get("/wishlists", protect, getWishlists);
router.delete("/wishlists/:wishlistId/items", Emptywishlist)    
router.put("/wishlists/:wishlistId/default",Setdefaultwishlist) 
router.delete("/wishlists/:wishlistId",Deleteentirewishlist) 
    // Get all wishlists

/* ----------------- Order Routes ----------------- */
router.post("/orders/place", protect, placeOrder);          // Place order
router.get("/orders/my", protect, getMyOrders);             // My orders

module.exports = router;
