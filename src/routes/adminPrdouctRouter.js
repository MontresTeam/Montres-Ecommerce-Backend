const express = require("express");
const { deleteProduct, addProduct, updateProduct } = require("../controllers/adminProductController");
const imageUpload = require("../config/multerConfig");
const imageUploadUpdate = require("../config/adminUploadin");

const router = express.Router(); 

router.delete('/:id',deleteProduct)
router.post('/',imageUpload,addProduct)
router.put('/:id',imageUploadUpdate,updateProduct)

module.exports = router;