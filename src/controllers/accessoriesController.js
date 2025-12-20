const Product = require("../models/product");
const mongoose = require("mongoose");

// ============================================
// GET ALL ACCESSORIES WITH FILTERING & PAGINATION
// ============================================
const getAccessoriesProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 15,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      condition,
      gender,
      material,
      color,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      inStock,
      featured,
      badges,
      published = true,
    } = req.query;

    // Base filter
    let filter = { category: "Accessories" };

    // Published products (default = true)
    filter.published = published === "true";

    // Category filters
    if (category) filter.accessoryCategory = category;
    if (subcategory) filter.accessorySubCategory = subcategory;

    // Brand filter
    if (brand) {
      filter.brand = { $regex: brand, $options: "i" };
    }

    // Condition, gender
    if (condition) filter.condition = condition;
    if (gender) filter.gender = gender;

    // Material & color (array)
    if (material) {
      filter.accessoryMaterial = { $in: Array.isArray(material) ? material : [material] };
    }
    if (color) {
      filter.accessoryColor = { $in: Array.isArray(color) ? color : [color] };
    }

    // In-stock & featured
    if (inStock !== undefined) filter.inStock = inStock === "true";
    if (featured !== undefined) filter.featured = featured === "true";

    // Badges
    if (badges) {
      filter.badges = { $in: Array.isArray(badges) ? badges : [badges] };
    }

    // -------------------------
    // PRICE FILTER (CLEAN)
    // -------------------------

    if (minPrice || maxPrice) {
      const min = minPrice ? parseFloat(minPrice) : 0;
      const max = maxPrice ? parseFloat(maxPrice) : Number.MAX_VALUE;

      filter.$or = [
        { salePrice: { $gte: min, $lte: max } },
        { sellingPrice: { $gte: min, $lte: max } },
        { regularPrice: { $gte: min, $lte: max } },
        { retailPrice: { $gte: min, $lte: max } },
      ];
    }

    // -------------------------
    // SEARCH FILTER (DO NOT OVERWRITE PRICE FILTER!)
    // -------------------------

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { accessoryName: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
          { model: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
        ],
      });
    }

    // -------------------------
    // SORTING
    // -------------------------
    const validSort = [
      "createdAt",
      "updatedAt",
      "name",
      "salePrice",
      "regularPrice",
      "sellingPrice",
      "retailPrice",
    ];

    const sortField = validSort.includes(sortBy) ? sortBy : "createdAt";
    const sortOptions = { [sortField]: sortOrder === "asc" ? 1 : -1 };

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Total count
    const totalProducts = await Product.countDocuments(filter);

    // Fetch products
    const products = await Product.find(filter)
      .select(
        "name accessoryName accessoryCategory accessorySubCategory brand model images salePrice regularPrice retailPrice sellingPrice stockQuantity inStock condition itemCondition badges featured published createdAt updatedAt"
      )
      .skip(skip)
      .limit(limitNum)
      .sort(sortOptions);

    // -------------------------
    // AGGREGATION FOR FILTERS
    // -------------------------
    const categoryAggregation = await Product.aggregate([
      { $match: { category: "Accessories", published: true } },
      { $group: { _id: "$accessoryCategory", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const brandAggregation = await Product.aggregate([
      { $match: { category: "Accessories", published: true } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const priceRangeAggregation = await Product.aggregate([
      { $match: { category: "Accessories", published: true } },
      {
        $project: {
          price: {
            $ifNull: [
              "$salePrice",
              { $ifNull: ["$sellingPrice", { $ifNull: ["$regularPrice", "$retailPrice"] }] },
            ],
          },
        },
      },
      {
        $bucket: {
          groupBy: "$price",
          boundaries: [0, 100, 500, 1000, 5000, 10000],
          default: "10000+",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    // RESPONSE
    res.json({
      success: true,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limitNum),
      currentPage: pageNum,
      limit: limitNum,
      products,
      filters: {
        categories: categoryAggregation,
        brands: brandAggregation,
        priceRanges: priceRangeAggregation,
      },
    });
  } catch (err) {
    console.error("Error fetching accessories:", err);
    res.status(500).json({
      success: false,
      message: "❌ Error fetching accessories",
      error: err.message,
    });
  }
};


// ============================================
// GET SINGLE ACCESSORY BY ID
// ============================================
const getAccessoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format",
      });
    }

    const product = await Product.findOne({
      _id: id,
      category: "Accessories",
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Accessory not found",
      });
    }

    // Get related accessories (same category or brand)
    const relatedAccessories = await Product.find({
      _id: { $ne: id },
      category: "Accessories",
      published: true,
      $or: [
        { accessoryCategory: product.accessoryCategory },
        { brand: product.brand },
        { accessorySubCategory: product.accessorySubCategory },
      ],
    })
      .limit(4)
      .select(
        "name accessoryName accessoryCategory brand images salePrice sellingPrice regularPrice retailPrice"
      );

    res.status(200).json({
      success: true,
      data: {
        accessory: product,
        relatedAccessories,
      },
    });
  } catch (error) {
    console.error("Error fetching accessory by ID:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


const createAccessory = async (req, res) => {
  try {
    // Extract data from FormData - handle both formats
    let data;
    
    // If data comes from FormData as a JSON string in "data" field
    if (req.body.data) {
      console.log("Data received in 'data' field:", req.body.data);
      
      try {
        // Parse the JSON string from FormData
        data = typeof req.body.data === 'string' 
          ? JSON.parse(req.body.data) 
          : req.body.data;
      } catch (parseError) {
        console.error("Error parsing JSON data:", parseError);
        return res.status(400).json({
          success: false,
          message: "Invalid JSON data format"
        });
      }
    } else {
      // If data comes directly (not using FormData)
      data = req.body;
    }
    
    console.log("Parsed data:", JSON.stringify(data, null, 2));
    
    // -----------------------------
    // Helpers
    // -----------------------------
    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };

    const parseNumber = (v) => {
      if (v === "" || v === null || v === undefined) return 0;
      const num = parseFloat(v);
      return isNaN(num) ? 0 : num;
    };
    
    const parseIntNum = (v) => {
      if (v === "" || v === null || v === undefined) return 0;
      const num = parseInt(v);
      return isNaN(num) ? 0 : num;
    };
    
    const parseBoolean = (v) => {
      if (v === "true" || v === true || v === 1) return true;
      if (v === "false" || v === false || v === 0) return false;
      return Boolean(v);
    };

    const safeArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

    const parseCondition = (value) => {
      if (!value) return "";
      if (Array.isArray(value)) return value[0] || "";
      if (typeof value === "string" && value.startsWith("[")) {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {
          return value;
        }
      }
      return value;
    };


    
    if (!data.brand || data.brand.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Brand is required.",
      });
    }

    if (!data.model || data.model.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Model is required.",
      });
    }

    // -----------------------------
    // 2. SKU VALIDATION (unique inside category)
    // -----------------------------
    if (data.sku && data.sku.trim() !== "") {
      const exists = await Product.findOne({
        sku: data.sku.trim(),
        category: "Accessories",
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists for another accessory.",
        });
      }
    }

    // -----------------------------
    // 3. PRODUCT NAME
    // -----------------------------
    const productName = data.name?.trim() 
      ? data.name.trim()
      : `${data.brand.trim()} ${data.model.trim()}`.trim();

    // -----------------------------
    // 4. PRODUCTION YEAR LOGIC
    // -----------------------------
    let productionYearValue = data.productionYear || "";

    if (parseBoolean(data.unknownYear)) {
      productionYearValue = "Unknown";
    } else if (parseBoolean(data.approximateYear) && productionYearValue) {
      productionYearValue = `Approx. ${productionYearValue}`;
    }

    // -----------------------------
    // 5. STOCK LOGIC
    // -----------------------------
    const stockQuantity = parseIntNum(data.stockQuantity) || 1;
    const inStock = parseBoolean(data.inStock ?? (stockQuantity > 0));

    // -----------------------------
    // 6. SAFE ARRAYS
    // -----------------------------
    const finalMaterial = safeArray(parseJSON(data.accessoryMaterial));
    const finalColor = safeArray(parseJSON(data.accessoryColor));
    const finalDelivery = safeArray(parseJSON(data.accessoryDelivery));
    const finalScope = safeArray(parseJSON(data.accessoryScopeOfDelivery));
    const finalBadges = [...new Set(safeArray(parseJSON(data.badges)))];
    const finalImages = safeArray(data.images || []);

    // -----------------------------
    // 7. CREATE ACCESSORY
    // -----------------------------
    const newAccessory = new Product({
      // BASIC
      name: productName,
      brand: data.brand.trim(),
      model: data.model.trim(),
      sku: data.sku ? data.sku.trim() : "",
      category: "Accessories",

      referenceNumber: data.referenceNumber ? data.referenceNumber.trim() : "",
      serialNumber: data.serialNumber ? data.serialNumber.trim() : "",
      additionalTitle: data.additionalTitle ? data.additionalTitle.trim() : "",

      // ACCESSORY FIELDS
      accessoryCategory: data.accessoryCategory || "",
      accessorySubCategory: data.accessorySubCategory || "",
      accessoryMaterial: finalMaterial,
      accessoryColor: finalColor,
      accessoryDelivery: finalDelivery,
      accessoryScopeOfDelivery: finalScope,

      // YEAR
      productionYear: productionYearValue,
      approximateYear: parseBoolean(data.approximateYear),
      unknownYear: parseBoolean(data.unknownYear),

      // CONDITION
      condition: parseCondition(data.condition),
      itemCondition: parseCondition(data.itemCondition),

      // OTHER FIELDS
      gender: data.gender || "Men/Unisex",

      // PRICING
      regularPrice: parseNumber(data.regularPrice),
      salePrice: parseNumber(data.salePrice),
      taxStatus: data.taxStatus || "taxable",

      // STOCK
      stockQuantity,
      inStock,

      // BADGES + IMAGES
      badges: finalBadges,
      images: finalImages,

      // SEO
      seoTitle: data.seoTitle?.trim() || productName,
      seoDescription:
        data.seoDescription?.trim() ||
        `Buy ${productName} - ${data.accessoryCategory || "Accessory"}`,
      seoKeywords: parseJSON(data.seoKeywords),

      // DESCRIPTION
      description:
        data.description?.trim() ||
        `Premium ${data.accessoryCategory || "Accessory"}`,

      // VISIBILITY
      visibility: data.visibility || "visible",
      published: parseBoolean(data.published ?? true),
      featured: parseBoolean(data.featured ?? false),

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedAccessory = await newAccessory.save();
    
    console.log("Accessory created successfully:", savedAccessory._id);

    res.status(201).json({
      success: true,
      message: "Accessory created successfully",
      product: savedAccessory,
    });
  } catch (error) {
    console.error("Accessory create error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
      details: error.errors,
    });
  }
};

// ============================================
// UPDATE ACCESSORY
// ============================================
const updateAccessory = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format",
      });
    }

    // Fetch product
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Accessory not found",
      });
    }

    if (existingProduct.category !== "Accessories") {
      return res.status(400).json({
        success: false,
        message: "Product is not an accessory",
      });
    }

    // Only include fields explicitly sent by client
    const updateData = {};
    for (const key in req.body) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // ============================================
    // YEAR HANDLING (update only if unknownYear sent)
    // ============================================
    if ('unknownYear' in updateData) {
      if (updateData.unknownYear === true) {
        updateData.productionYear = "Unknown";
      } else if (updateData.unknownYear === false && updateData.productionYear === "Unknown") {
        updateData.productionYear = null;
      }
    }

    // ============================================
    // AUTO NAME LOGIC (only if name not sent)
    // ============================================
    const newBrand = updateData.brand ?? existingProduct.brand;
    const newModel = updateData.model ?? existingProduct.model;

    if (!('name' in updateData) && (updateData.brand || updateData.model)) {
      const autoName = `${newBrand || ""} ${newModel || ""}`.trim();
      updateData.name = autoName;
      updateData.accessoryName = autoName;
    } else if ('name' in updateData) {
      // if user updates name manually → sync accessoryName
      updateData.accessoryName = updateData.name;
    }

    // ============================================
    // STOCK STATUS
    // ============================================
    if ('stockQuantity' in updateData) {
      updateData.inStock = updateData.stockQuantity > 0;
    }

    // ============================================
    // PRICE CONSISTENCY
    // ============================================
    if ('retailPrice' in updateData && !('sellingPrice' in updateData)) {
      updateData.sellingPrice = updateData.retailPrice;
    }

    // ============================================
    // SKU DUPLICATE CHECK
    // ============================================
    if ('sku' in updateData && updateData.sku !== existingProduct.sku) {
      const existingWithSKU = await Product.findOne({
        sku: updateData.sku,
        category: "Accessories",
        _id: { $ne: id },
      });

      if (existingWithSKU) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists for another accessory",
        });
      }
    }

    // ============================================
    // AUTO SEO IF NAME CHANGES
    // ============================================
    const finalName = updateData.name ?? existingProduct.name;

    if (!('seoTitle' in updateData) && 'name' in updateData) {
      updateData.seoTitle = finalName;
    }

    if (!('seoDescription' in updateData) && 'name' in updateData) {
      updateData.seoDescription = `Buy ${finalName} - Premium Accessory`;
    }

    // ============================================
    // UPDATE PRODUCT
    // ============================================
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Accessory not found after update",
      });
    }

    res.status(200).json({
      success: true,
      message: "Accessory updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating accessory:", error);

    // Duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate entry found. ${field} already exists.`,
      });
    }

    // Validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    // Server error
    res.status(500).json({
      success: false,
      message: "Server error, could not update accessory",
      error: error.message,
    });
  }
};


// ============================================
// DELETE ACCESSORY (SOFT DELETE)
// ============================================
const deleteAccessory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format",
      });
    }

    // Verify it's an accessory
    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Accessory not found",
      });
    }

    if (existingProduct.category !== "Accessories") {
      return res.status(400).json({
        success: false,
        message: "Product is not an accessory",
      });
    }

    // Soft delete by setting published to false and out of stock
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        published: false,
        inStock: false,
        visibility: "hidden",
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Accessory deleted successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Error deleting accessory:", error);
    res.status(500).json({
      success: false,
      message: "Server error, could not delete accessory",
      error: error.message,
    });
  }
};




// ============================================
// GET ALL ACCESSORIES
// ============================================
const getAllAccessories = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 15,
      published = "true",
      subcategory,
      brand,
      gender,
      material,
      color,
      condition,
      minPrice,
      maxPrice,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Convert pagination to number
    page = parseInt(page);
    limit = parseInt(limit);

    // Base filter
    const filter = { category: "Accessories" };

    // Published filter
    if (published !== "false") {
      filter.published = true;
    }

    // Optional filters
    if (subcategory) filter.subcategory = subcategory;
    if (brand) filter.brand = brand;
    if (gender) filter.gender = gender;
    if (material) filter.material = material;
    if (color) filter.color = color;
    if (condition) filter.condition = condition;

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Search filter
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Count total
    const totalProducts = await Product.countDocuments(filter);

    // Fetch products
    const products = await Product.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      totalProducts,
      totalPages: Math.ceil(totalProducts / limit),
      currentPage: page,
      limit,
      products,
    });

  } catch (error) {
    console.error("Accessories Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  getAccessoriesProducts, 
  getAccessoryById, 
  createAccessory, 
  updateAccessory, 
  deleteAccessory, 
  getAllAccessories
};
