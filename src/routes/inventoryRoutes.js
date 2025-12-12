const express = require("express");
const router = express.Router();
const {
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  importInventory,
  exportInventory,
} = require("../controllers/csvController");
const multer = require("multer")
const upload = multer({ dest: "uploads/" }); // temp folder

router.get("/", getInventory);
router.get("/:id", getInventoryById);
router.post("/", createInventory);
router.put("/updated/:id", updateInventory);
router.delete("/:id", deleteInventory);

router.post("/import", upload.single("file"), importInventory);
router.get("/export", exportInventory);

module.exports = router;
