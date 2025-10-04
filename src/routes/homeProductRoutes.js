const express = require("express");
const { addHomeProductsGrid, updateHomeProducts, getHomeProductsGrid } = require("../controllers/homeProuctsController");
const router = express.Router();

router.post('/addhomeproduct',addHomeProductsGrid)
router.put('/updatehomeproduct',updateHomeProducts)
router.get('/',getHomeProductsGrid)
module.exports = router;
