const express = require("express");
const { addProduct, deleteProduct, updateProduct } = require("../controllers/adminProductController");
const addProductImageUpload = require("../config/addProductImageUpload"); // main+cover
const updateProductImageUpload = require("../config/updateProductImageUpload");

const router = express.Router();

router.delete("/:id", deleteProduct);
router.post("/", addProductImageUpload, addProduct); // only add product uses main+cover
router.put("/:id", updateProductImageUpload,  updateProduct); // other routes can use generic upload

module.exports = router;
