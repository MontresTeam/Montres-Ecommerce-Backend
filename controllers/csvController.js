const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const InventoryStock = require("../models/InventoryStockModel");
const MonthEndReport = require("../models/MonthEndReportModel");

// Helper to safely parse numbers
function parseNumber(value) {
  if (!value) return 0;
  const num = Number(value.toString().replace(/,/g, "").trim());
  return isNaN(num) ? 0 : num;
}

// Helper for quantity like: "10pcs (3 sold)"
function parseQuantity(value) {
  if (!value) return 0;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

// ---------------------- GET ALL ----------------------
const getInventory = async (req, res) => {
  try {
    const items = await InventoryStock.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ---------------------- GET ONE ----------------------
const getInventoryById = async (req, res) => {
  try {
    const item = await InventoryStock.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const getMonthlySalesReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    // Validate input
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        error: "Year and month parameters are required",
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ success: false, error: "Invalid year" });
    }

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid month (1-12)" });
    }

    // Date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 1);

    // Fetch all SOLD items
    let soldItems = await InventoryStock.find({ status: "SOLD" }).sort({
      soldAt: -1,
    });

    // Parse any string soldAt values (legacy data)
    soldItems = soldItems.map((item) => {
      let soldAtDate = item.soldAt;

      if (soldAtDate && typeof soldAtDate === "string") {
        const parts = soldAtDate.split("/");
        if (parts.length === 3) {
          let day, month, year;
          if (parseInt(parts[0]) > 12) {
            day = parts[0];
            month = parts[1];
          } else {
            month = parts[0];
            day = parts[1];
          }
          year = parts[2];
          soldAtDate = new Date(year, month - 1, day);
        } else {
          soldAtDate = new Date(soldAtDate);
        }
      }

      return {
        ...item.toObject(),
        soldAt: soldAtDate,
      };
    });

    // Filter items in the requested month
    soldItems = soldItems.filter(
      (item) => item.soldAt >= startDate && item.soldAt < endDate
    );

    // Calculate totals
    const totalSales = soldItems.reduce(
      (sum, item) => sum + (item.soldPrice || 0),
      0
    );
    const totalCost = soldItems.reduce(
      (sum, item) => sum + (item.cost || 0),
      0
    );
    const profit = totalSales - totalCost;
    const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

    // Category-wise breakdown
    const categoryBreakdown = {};
    soldItems.forEach((item) => {
      if (!categoryBreakdown[item.category]) {
        categoryBreakdown[item.category] = { count: 0, revenue: 0, cost: 0 };
      }
      categoryBreakdown[item.category].count++;
      categoryBreakdown[item.category].revenue += item.soldPrice || 0;
      categoryBreakdown[item.category].cost += item.cost || 0;
    });

    // Response
    const response = {
      success: true,
      period: {
        year: yearNum,
        month: monthNum,
        monthName: new Date(yearNum, monthNum - 1, 1).toLocaleString(
          "default",
          { month: "long" }
        ),
        startDate,
        endDate,
      },
      summary: {
        totalItemsSold: soldItems.length,
        totalSales,
        totalCost,
        profit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        averageSaleValue:
          soldItems.length > 0 ? totalSales / soldItems.length : 0,
      },
      categoryBreakdown: Object.entries(categoryBreakdown).map(
        ([category, data]) => ({
          category,
          itemsSold: data.count,
          revenue: data.revenue,
          cost: data.cost,
          profit: data.revenue - data.cost,
        })
      ),
      soldItems: soldItems.map((item) => ({
        id: item._id,
        productName: item.productName,
        category: item.category,
        sku: item.sku,
        soldAt: item.soldAt
          ? `${item.soldAt.getMonth() + 1}/${item.soldAt.getDate()}/${item.soldAt.getFullYear()}`
          : null,
        cost: item.cost,
        price: item.price,
        soldPrice: item.soldPrice,
        profit: (item.soldPrice || 0) - (item.cost || 0),
        description: item.description,
      })),
      metadata: {
        generatedAt: new Date(),
        count: soldItems.length,
      },
    };

    res.json(response);
  } catch (err) {
    console.error("Error fetching monthly sales report:", err);
    res.status(500).json({
      success: false,
      error: "Server error while fetching sales report",
      details: err.message,
    });
  }
};

const getInventoryMonthEndReports = async (req, res) => {
  try {
    const reports = await MonthEndReport.find().sort({ year: -1, monthNumber: -1 });
    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const calculateInventoryMonthEnd = async (req, res) => {
  try {
    const { year, month } = req.body; // month is 1-12

    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 1);

    // 1. COGS: Cost of items sold during this month
    const soldItems = await InventoryStock.find({
      status: "SOLD",
      soldAt: { $gte: startDate, $lt: endDate }
    });
    const cogs = soldItems.reduce((sum, item) => sum + (item.cost || 0), 0);

    // 2. Purchases: Items added during this month
    const purchasedItems = await InventoryStock.find({
      createdAt: { $gte: startDate, $lt: endDate }
    });
    const purchases = purchasedItems.reduce((sum, item) => sum + (item.cost || 0), 0);

    // 3. Ending Inventory: Value of all AVAILABLE items at the end of this month
    // Simplified: Current value of AVAILABLE items + items sold AFTER this month but added BEFORE/DURING this month
    const availableItems = await InventoryStock.find({
      status: "AVAILABLE",
      createdAt: { $lt: endDate }
    });

    const soldLaterItems = await InventoryStock.find({
      status: "SOLD",
      soldAt: { $gte: endDate },
      createdAt: { $lt: endDate }
    });

    const endingInventory = [...availableItems, ...soldLaterItems].reduce((sum, item) => sum + (item.cost || 0), 0);

    // 4. Beginning Inventory: Ending Inventory of previous month
    // For simplicity, we'll calculate it as Ending Inventory - Purchases + COGS
    const beginningInventory = endingInventory - purchases + cogs;

    // Category Breakdown for Ending Inventory
    const categoryBreakdown = {};
    [...availableItems, ...soldLaterItems].forEach(item => {
      const cat = item.category || 'Other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + (item.cost || 0);
    });

    const monthName = startDate.toLocaleString('default', { month: 'long' });
    const monthLabel = `${monthName} ${yearNum}`;

    // Update or Create Report
    const reportData = {
      month: monthLabel,
      year: yearNum,
      monthNumber: monthNum,
      beginningInventory,
      purchases,
      cogs,
      endingInventory,
      variance: 0, // Manual adjustment if needed
      accuracy: 99, // Placeholder
      status: 'completed',
      lastUpdated: new Date(),
      categoryBreakdown
    };

    const report = await MonthEndReport.findOneAndUpdate(
      { year: yearNum, monthNumber: monthNum },
      reportData,
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      data: report
    });

  } catch (err) {
    console.error("Error calculating month-end:", err);
    res.status(500).json({ error: err.message });
  }
};



// ---------------------- CREATE ----------------------
const createInventory = async (req, res) => {
  try {
    const newItem = await InventoryStock.create(req.body);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const existingItem = await InventoryStock.findById(id);
    if (!existingItem) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const updateData = { ...req.body };

    /* =====================================================
       🧩 SAFE DATE PARSER (STRING → DATE)
    ===================================================== */
    const parseSoldDate = (value) => {
      if (!value) return null;

      // Already a Date object
      if (value instanceof Date) return value;

      if (typeof value === "string") {
        // Handle DD/MM/YYYY or MM/DD/YYYY
        if (value.includes("/")) {
          const parts = value.split("/");
          if (parts.length === 3) {
            let day, month, year;

            // If day > 12 → must be DD/MM/YYYY
            if (parseInt(parts[0]) > 12) {
              day = parts[0];
              month = parts[1];
            } else {
              // Default to MM/DD/YYYY
              month = parts[0];
              day = parts[1];
            }

            year = parts[2];
            return new Date(year, month - 1, day);
          }
        }

        // ISO or timestamp
        const parsed = new Date(value);
        if (!isNaN(parsed)) return parsed;
      }

      return null;
    };

    /* =====================================================
       ✅ SOLD LOGIC
    ===================================================== */
    if (req.body.status === "SOLD") {
      if (req.body.soldAt) {
        updateData.soldAt = parseSoldDate(req.body.soldAt);
      }
      else if (existingItem.status !== "SOLD") {
        updateData.soldAt = new Date();
      }
      else {
        updateData.soldAt = existingItem.soldAt;
      }
    }

    /* =====================================================
       🔄 REVERT TO AVAILABLE
    ===================================================== */
    if (req.body.status === "AVAILABLE") {
      updateData.soldAt = null;
    }

    /* =====================================================
       🚀 UPDATE DB
    ===================================================== */
    const updatedItem = await InventoryStock.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedItem,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};




// ---------------------- DELETE ----------------------
const deleteInventory = async (req, res) => {
  try {
    const deleted = await InventoryStock.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Item not found" });

    res.status(200).json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- IMPORT CSV / EXCEL ----------------------
const importInventory = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  const ext = path.extname(req.file.originalname);
  const results = [];

  try {
    // ---------------- CSV Import ----------------
    if (ext === ".csv") {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (!row["BRAND/PRODUCT NAME"]) return;

          results.push({
            brand: row["BRAND/PRODUCT NAME"]?.trim() || "",
            internalCode: row["Code"]?.trim() || "",
            quantity: parseQuantity(row["QUANTITY"]),
            status:
              row["AVAILABLE/SOLD/AUCTION"]?.trim().toUpperCase() ||
              "AVAILABLE",
            cost: parseNumber(row["Cost"]),
            sellingPrice: parseNumber(row["Selling Price"]),
            soldPrice: parseNumber(row["SOLD PRICE"]),
            paymentMethod: row["PAYMENT METHOD"]?.trim() || "",
            receivingAmount: parseNumber(row["reciving amount"]),
          });
        })
        .on("end", async () => {
          try {
            await InventoryStock.insertMany(results);
            fs.unlinkSync(req.file.path);
            res.status(200).json({
              message: "CSV data imported",
              count: results.length,
            });
          } catch (err) {
            res.status(500).json({ error: err.message });
          }
        });
    }

    // ---------------- Excel Import ----------------
    else {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      sheet.forEach((row) => {
        if (!row["BRAND/PRODUCT NAME"]) return;

        results.push({
          brand: row["BRAND/PRODUCT NAME"]?.trim() || "",
          internalCode: row["Code"]?.trim() || "",
          quantity: parseQuantity(row["QUANTITY"]),
          status:
            row["AVAILABLE/SOLD/AUCTION"]?.trim().toUpperCase() || "AVAILABLE",
          cost: parseNumber(row["Cost"]),
          sellingPrice: parseNumber(row["Selling Price"]),
          soldPrice: parseNumber(row["SOLD PRICE"]),
          paymentMethod: row["PAYMENT METHOD"]?.trim() || "",
          receivingAmount: parseNumber(row["reciving amount"]),
        });
      });

      await InventoryStock.insertMany(results);
      fs.unlinkSync(req.file.path);

      res.status(200).json({
        message: "Excel data imported",
        count: results.length,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- EXPORT Excel ----------------------
const exportInventory = async (req, res) => {
  try {
    const items = await InventoryStock.find().sort({ createdAt: -1 });

    const worksheet = xlsx.utils.json_to_sheet(
      items.map((item) => ({
        productName: item.productName,
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

    const exportDir = path.join(__dirname, "../exports");
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const exportFile = path.join(exportDir, "inventory_export.xlsx");
    xlsx.writeFile(workbook, exportFile);

    res.download(exportFile, "inventory_export.xlsx", (err) => {
      if (err) console.error(err);
      fs.unlinkSync(exportFile);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------- EXPORT ----------------------
module.exports = {
  getInventory,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
  importInventory,
  exportInventory,
  getMonthlySalesReport,
  getInventoryMonthEndReports,
  calculateInventoryMonthEnd
};
