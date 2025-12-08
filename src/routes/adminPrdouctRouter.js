const express = require("express");
const { addProduct, deleteProduct, updateProduct, getLimitedEditionProducts } = require("../controllers/adminProductController");
const addProductImageUpload = require("../config/addProductImageUpload"); // main+cover
const updateProductImageUpload = require("../config/updateProductImageUpload");

const router = express.Router();

router.delete("/:id", deleteProduct);

router.post("/add", addProductImageUpload, addProduct);
router.put("/:id", updateProductImageUpload,  updateProduct); // other routes can use generic upload
router.get("/getLimited",getLimitedEditionProducts)
module.exports = router;
