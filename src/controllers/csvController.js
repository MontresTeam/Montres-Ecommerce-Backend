const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const InventoryStock = require("../models/InventoryStockModel");

// Helper to parse numbers safely
function parseNumber(value) {
  if (!value) return 0;
  const num = Number(value.toString().replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
}

// Helper to parse quantity like "10pcs (3 sold)"
function parseQuantity(value) {
  if (!value) return 0;
  const match = value.match(/\d+/); // take first number
  return match ? Number(match[0]) : 0;
}

// GET all inventory
const getInventory = async (req, res) => {
  try {
    const items = await InventoryStock.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// IMPORT CSV / Excel
const importInventory = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const ext = path.extname(req.file.originalname);
  const results = [];

  try {
    // ------------------ CSV IMPORT ---------------------
    if (ext === ".csv") {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {

          // FIX: Import only if brand exists
          if (!row['BRAND/PRODUCT NAME']) return;

          results.push({
            brand: row['BRAND/PRODUCT NAME']?.trim() || "",
            internalCode: row['Code']?.trim() || "",
            quantity: parseQuantity(row['QUANTITY']),
            status: (row['AVAILABLE/SOLD/AUCTION']?.trim().toUpperCase() || "AVAILABLE"),
            cost: parseNumber(row['Cost']),
            sellingPrice: parseNumber(row['Selling Price']),
            soldPrice: parseNumber(row['SOLD PRICE']),
            paymentMethod: row['PAYMENT METHOD']?.trim() || "",
            receivingAmount: parseNumber(row['reciving amount']),
          });
        })
        .on("end", async () => {
          try {
            await InventoryStock.insertMany(results);
            fs.unlinkSync(req.file.path);
            res.status(200).json({ message: "CSV data imported", count: results.length });
          } catch (err) {
            res.status(500).json({ error: err.message });
          }
        });
    }

    // ------------------ EXCEL IMPORT ---------------------
    else {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      sheet.forEach((row) => {

        // FIX: Import only if brand exists
        if (!row['BRAND/PRODUCT NAME']) return;

        results.push({
          brand: row['BRAND/PRODUCT NAME']?.trim() || "",
          internalCode: row['Code']?.trim() || "",
          quantity: parseQuantity(row['QUANTITY']),
          status: (row['AVAILABLE/SOLD/AUCTION']?.trim().toUpperCase() || "AVAILABLE"),
          cost: parseNumber(row['Cost']),
          sellingPrice: parseNumber(row['Selling Price']),
          soldPrice: parseNumber(row['SOLD PRICE']),
          paymentMethod: row['PAYMENT METHOD']?.trim() || "",
          receivingAmount: parseNumber(row['reciving amount']),
        });
      });

      await InventoryStock.insertMany(results);
      fs.unlinkSync(req.file.path);
      res.status(200).json({ message: "Excel data imported", count: results.length });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// EXPORT Excel
const exportInventory = async (req, res) => {
  try {
    const items = await InventoryStock.find().sort({ createdAt: -1 });

    const worksheet = xlsx.utils.json_to_sheet(
      items.map(item => ({
        brand: item.brand,
        internalCode: item.internalCode,
        quantity: item.quantity,
        status: item.status,
        cost: item.cost,
        sellingPrice: item.sellingPrice,
        soldPrice: item.soldPrice,
        paymentMethod: item.paymentMethod,
        receivingAmount: item.receivingAmount,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
    );

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "InventoryStock");

    const exportFile = path.join(__dirname, "../exports/inventory_export.xlsx");
    xlsx.writeFile(workbook, exportFile);

    res.download(exportFile, "inventory_export.xlsx", (err) => {
      if (err) console.error(err);
      fs.unlinkSync(exportFile);
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getInventory,
  importInventory,
  exportInventory,
};
