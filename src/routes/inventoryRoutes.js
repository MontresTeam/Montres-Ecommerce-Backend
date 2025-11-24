const express = require("express");
const router = express.Router();
const multer = require("multer");
const inventoryController = require("../controllers/csvController");

const upload = multer({ dest: "uploads/" }); // temp folder

router.get("/", inventoryController.getInventory);
router.post("/import", upload.single("file"), inventoryController.importInventory);
router.get("/export", inventoryController.exportInventory);

module.exports = router;
