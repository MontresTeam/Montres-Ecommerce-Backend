const express = require("express");
const { addHomeProductsGrid, updateHomeProducts, getHomeProductsGrid, getBrandNewProducts, updateBrandNewProducts, updateTrustedProducts, getTrustedProduct,  } = require("../controllers/homeProuctsController");
const router = express.Router();

router.post('/addhomeproduct',addHomeProductsGrid)
router.put('/updatehomeproduct/:id',updateHomeProducts)
router.get('/',getHomeProductsGrid)
router.get('/brandnew',getBrandNewProducts)
router.put('/brandnew',updateBrandNewProducts)
router.get('/trusted',getTrustedProduct),
router.put('/updatetrusted',updateTrustedProducts)
module.exports = router;
