const express = require("express");
const { filerDatareferenceNumber } = require("../controllers/filterController");
const router = express.Router();

router.get("/reference-numbers", filerDatareferenceNumber);
module.exports = router;    
