const express = require("express");
const { addProduct, deleteProduct, updateProduct, getLimitedEditionProducts, getLowStockProducts, getDeadStockProducts } = require("../controllers/adminProductController");
const addProductImageUpload = require("../config/addProductImageUpload"); // main+cover
const updateProductImageUpload = require("../config/updateProductImageUpload");
const { adminProtect, restrictTo } = require("../middlewares/authMiddleware");

const router = express.Router();

// Apply adminProtect to all routes in this router
router.use(adminProtect);

// Only CEO and Developer can delete products
router.delete("/:id", restrictTo("ceo", "developer"), deleteProduct);

router.post("/add", addProductImageUpload, addProduct);
router.put("/:id", updateProductImageUpload, updateProduct); // other routes can use generic upload
router.get("/getLimited", getLimitedEditionProducts)
router.get("/reports/low-stock", getLowStockProducts);
router.get("/reports/dead-stock", getDeadStockProducts);
module.exports = router;
