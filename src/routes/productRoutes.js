const express = require("express");
const {
  getProducts,
} = require("../controllers/productController");

const router = express.Router();

// Routes
router.get("/", getProducts);

module.exports = router;
