const Product = require("../models/product");
const notifyRestock = require("../utils/notifyRestock"); // Restock notification utility

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Delete product
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting product",
      error: error.message,
    });
  }
};

const addProduct = async (req, res) => {
  try {
    const productData = req.body;

    // Parse images added by middleware
    const images = productData.images || [];

    // Required field validation
    if (!productData.brand || !productData.model || !productData.category) {
      return res.status(400).json({
        message: "Brand, model and category are required fields.",
      });
    }

    // ------------ Parsing Helpers ------------
    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };

    const parseNumber = (val) => (val ? parseFloat(val) || 0 : 0);
    const parseIntNum = (val) => (val ? parseInt(val) || 0 : 0);
    const parseBoolean = (val) => val === "true" || val === true;

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

    // ----------- Production Year Logic -----------
    let productionYearValue = productData.productionYear || "";

    if (parseBoolean(productData.unknownYear)) {
      productionYearValue = "Unknown";
    } else if (
      parseBoolean(productData.approximateYear) &&
      productionYearValue
    ) {
      productionYearValue = `Approx. ${productionYearValue}`;
    }

    // Generate product name if missing
    const productName =
      productData.name || `${productData.brand} ${productData.model}`;

    // 🔥 FIX: Auto-calculate inStock based on stockQuantity
    const stockQuantity = parseIntNum(productData.stockQuantity);
    const inStock = stockQuantity > 0; // Auto-calculate inStock

    const newProduct = new Product({
      // BASIC INFORMATION
      brand: productData.brand,
      model: productData.model,
      name: productName,
      sku: productData.sku || "",
      referenceNumber: productData.referenceNumber || "",
      serialNumber: productData.serialNumber || "",
      additionalTitle: productData.additionalTitle || "",
      watchType: productData.watchType || "",
      watchStyle: productData.watchStyle || "",

      // 🔥 FIXED: ARRAY ENUM FIELD MUST BE PARSED
      scopeOfDeliveryWatch: parseJSON(productData.scopeOfDeliveryWatch),

      includedAccessories: parseJSON(productData.includedAccessories),
      category: productData.category,

      // CONDITION
      condition: parseCondition(productData.condition),
      itemCondition: parseCondition(productData.itemCondition),

      // YEAR LOGIC APPLIED
      productionYear: productionYearValue,
      approximateYear: parseBoolean(productData.approximateYear),
      unknownYear: parseBoolean(productData.unknownYear),

      // FEATURES
      gender: productData.gender || "Men/Unisex",
      movement: productData.movement || "",
      dialColor: productData.dialColor || "",
      caseMaterial: productData.caseMaterial || "",
      strapMaterial: productData.strapMaterial || "",
      strapColor: productData.strapColor || "",
      badges: [...new Set(parseJSON(productData.badges))],
      strapSize: parseNumber(productData.strapSize),
      caseSize: parseNumber(productData.caseSize),
      caseColor: productData.caseColor || "",
      crystal: productData.crystal || "",
      bezelMaterial: productData.bezelMaterial || "",
      dialNumerals: productData.dialNumerals || "No Numerals",
      caliber: productData.caliber || "",
      powerReserve: parseNumber(productData.powerReserve),
      jewels: parseIntNum(productData.jewels),
      functions: parseJSON(productData.functions),
      replacementParts: parseJSON(productData.replacementParts),

      // PRICING
      regularPrice: parseNumber(productData.regularPrice),
      salePrice: parseNumber(productData.salePrice),
      taxStatus: productData.taxStatus || "taxable",
      stockQuantity: stockQuantity,

      // 🔥 FIX: Auto-calculated inStock
      inStock: inStock,

      // DESCRIPTION & VISIBILITY
      description: productData.description || "",
      visibility: productData.visibility || "visible",

      // SEO
      seoTitle: productData.seoTitle || "",
      seoDescription: productData.seoDescription || "",
      seoKeywords: parseJSON(productData.seoKeywords),

      // PRODUCT META
      published: productData.published ?? true,
      featured: productData.featured ?? false,
      // inStock: productData.inStock ?? true, // REMOVED - using auto-calculated value

      // IMAGES
      images,

      // EXTRA
      meta: productData.meta || {},
      attributes: productData.attributes || [],

      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedProduct = await newProduct.save();

    const response = await Product.findById(savedProduct._id).select(
      "brand model name sku referenceNumber serialNumber watchType watchStyle scopeOfDeliveryWatch " +
        "productionYear gender movement dialColor caseMaterial strapMaterial strapColor dialNumerals " +
        "salePrice regularPrice stockQuantity taxStatus strapSize caseSize includedAccessories " +
        "condition itemCondition category description visibility published featured inStock " +
        "badges images createdAt updatedAt"
    );

    res.status(201).json({
      success: true,
      message: "Product added successfully!",
      product: response,
    });
  } catch (error) {
    console.log("Add product error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
      details: error.errors,
    });
  }
};



const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("Request files:", req.files);
    console.log("Request body:", req.body);
    console.log("Uploaded images:", req.body.images);

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Helper functions (same as before)
    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };

    const parseNumber = (value) => {
      if (value === undefined || value === null) return undefined;
      return parseFloat(value);
    };

    const parseInteger = (value) => {
      if (value === undefined || value === null) return undefined;
      return parseInt(value);
    };

    const parseBoolean = (value) => {
      if (value === undefined || value === null) return undefined;
      return value === "true" || value === true;
    };

    // Handle images (same as before)
    let updatedImages = [...(product.images || [])];

    if (req.body.images && req.body.images.length > 0) {
      updatedImages = req.body.images;
    } else if (req.body.uploadedImages) {
      const parsedImages = parseJSON(req.body.uploadedImages);
      if (parsedImages.length > 0) updatedImages = parsedImages;
    }

    console.log("Final images array:", updatedImages);

    // Generate product name
    let productName = product.name;
    if (req.body.brand || req.body.model) {
      const brand = req.body.brand || product.brand;
      const model = req.body.model || product.model;
      productName = `${brand} ${model}`;
    }

    // 🔥 FIX: Auto-calculate inStock based on stockQuantity
    let stockQuantity = product.stockQuantity;
    if (req.body.stockQuantity !== undefined) {
      stockQuantity = parseInteger(req.body.stockQuantity);
    }

    // Auto-calculate inStock - if stockQuantity is provided, use it to determine inStock
    // Otherwise, if inStock is explicitly provided, use that
    let inStock;
    if (req.body.stockQuantity !== undefined) {
      inStock = stockQuantity > 0; // Auto-calculate from stockQuantity
    } else if (req.body.inStock !== undefined) {
      inStock = parseBoolean(req.body.inStock); // Use explicit value
    } else {
      inStock = product.inStock; // Keep existing value
    }

    const updatedFields = {
      // ────────────── BASIC INFORMATION ──────────────
      ...(req.body.brand && { brand: req.body.brand }),
      ...(req.body.model && { model: req.body.model }),
      name: productName,
      ...(req.body.sku !== undefined && { sku: req.body.sku }),
      ...(req.body.referenceNumber !== undefined && {
        referenceNumber: req.body.referenceNumber,
      }),
      ...(req.body.serialNumber !== undefined && {
        serialNumber: req.body.serialNumber,
      }),
      ...(req.body.additionalTitle !== undefined && {
        additionalTitle: req.body.additionalTitle,
      }),
      ...(req.body.watchType !== undefined && {
        watchType: req.body.watchType,
      }),
      ...(req.body.watchStyle !== undefined && {
        watchStyle: req.body.watchStyle,
      }),
      ...(req.body.scopeOfDeliveryWatch !== undefined && {
        scopeOfDeliveryWatch: req.body.scopeOfDeliveryWatch,
      }),
      ...(req.body.includedAccessories !== undefined && {
        includedAccessories: parseJSON(req.body.includedAccessories),
      }),
      ...(req.body.category !== undefined && { category: req.body.category }),

      // ────────────── CONDITION INFORMATION ──────────────
      ...(req.body.condition !== undefined && {
        condition: req.body.condition,
      }),
      ...(req.body.itemCondition !== undefined && {
        itemCondition: req.body.itemCondition,
      }),

      // ────────────── ITEM FEATURES ──────────────
      ...(req.body.productionYear !== undefined && {
        productionYear: req.body.productionYear,
      }),
      ...(req.body.approximateYear !== undefined && {
        approximateYear: parseBoolean(req.body.approximateYear),
      }),
      ...(req.body.unknownYear !== undefined && {
        unknownYear: parseBoolean(req.body.unknownYear),
      }),
      ...(req.body.gender !== undefined && { gender: req.body.gender }),
      ...(req.body.movement !== undefined && { movement: req.body.movement }),
      ...(req.body.dialColor !== undefined && {
        dialColor: req.body.dialColor,
      }),
      ...(req.body.caseMaterial !== undefined && {
        caseMaterial: req.body.caseMaterial,
      }),
      ...(req.body.strapMaterial !== undefined && {
        strapMaterial: req.body.strapMaterial,
      }),

      // ────────────── ADDITIONAL INFORMATION ──────────────
      ...(req.body.strapColor !== undefined && {
        strapColor: req.body.strapColor,
      }),
      ...(req.body.badges !== undefined && {
        badges: parseJSON(req.body.badges),
      }),
      ...(req.body.strapSize !== undefined && {
        strapSize: parseNumber(req.body.strapSize),
      }),
      ...(req.body.caseSize !== undefined && {
        caseSize: parseNumber(req.body.caseSize),
      }),
      ...(req.body.caseColor !== undefined && {
        caseColor: req.body.caseColor,
      }),
      ...(req.body.crystal !== undefined && { crystal: req.body.crystal }),
      ...(req.body.bezelMaterial !== undefined && {
        bezelMaterial: req.body.bezelMaterial,
      }),
      ...(req.body.dialNumerals !== undefined && {
        dialNumerals: req.body.dialNumerals,
      }),
      ...(req.body.caliber !== undefined && { caliber: req.body.caliber }),
      ...(req.body.powerReserve !== undefined && {
        powerReserve: parseNumber(req.body.powerReserve),
      }),
      ...(req.body.jewels !== undefined && {
        jewels: parseInteger(req.body.jewels),
      }),
      ...(req.body.functions !== undefined && {
        functions: parseJSON(req.body.functions),
      }),
      ...(req.body.replacementParts !== undefined && {
        replacementParts: parseJSON(req.body.replacementParts),
      }),

      // ────────────── PRICING & INVENTORY ──────────────
      ...(req.body.regularPrice !== undefined && {
        regularPrice: parseNumber(req.body.regularPrice),
      }),
      ...(req.body.salePrice !== undefined && {
        salePrice: parseNumber(req.body.salePrice),
      }),
      ...(req.body.taxStatus !== undefined && {
        taxStatus: req.body.taxStatus,
      }),
      ...(req.body.stockQuantity !== undefined && {
        stockQuantity: stockQuantity,
      }),

      // 🔥 FIX: Auto-calculated inStock
      inStock: inStock,

      // ────────────── DESCRIPTION & META ──────────────
      ...(req.body.description !== undefined && {
        description: req.body.description,
      }),
      ...(req.body.visibility !== undefined && {
        visibility: req.body.visibility,
      }),

      // ────────────── SEO FIELDS ──────────────
      ...(req.body.seoTitle !== undefined && { seoTitle: req.body.seoTitle }),
      ...(req.body.seoDescription !== undefined && {
        seoDescription: req.body.seoDescription,
      }),
      ...(req.body.seoKeywords !== undefined && {
        seoKeywords: parseJSON(req.body.seoKeywords),
      }),

      // ────────────── CORE PRODUCT INFO ──────────────
      ...(req.body.published !== undefined && {
        published: parseBoolean(req.body.published),
      }),
      ...(req.body.featured !== undefined && {
        featured: parseBoolean(req.body.featured),
      }),
      // inStock: inStock, // Already set above

      // ────────────── MEDIA ──────────────
      images: updatedImages,

      // ────────────── META & ATTRIBUTES ──────────────
      ...(req.body.meta !== undefined && { meta: req.body.meta }),
      ...(req.body.attributes !== undefined && {
        attributes: req.body.attributes,
      }),

      // ────────────── TRACKING ──────────────
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(updatedFields).forEach((key) => {
      if (updatedFields[key] === undefined) delete updatedFields[key];
    });

    // Update product in DB
    const updatedProduct = await Product.findByIdAndUpdate(id, updatedFields, {
      new: true,
      runValidators: true,
    }).select(
      "brand model name sku referenceNumber serialNumber watchType watchStyle scopeOfDeliveryWatch " +
        "productionYear gender movement dialColor caseMaterial strapMaterial strapColor " +
        "regularPrice salePrice stockQuantity taxStatus strapSize caseSize includedAccessories " +
        "condition itemCondition description visibility published featured inStock category " +
        "badges images createdAt updatedAt"
    );

    // ────────────── TRIGGER RESTOCK NOTIFICATIONS ──────────────
    if (
      updatedFields.stockQuantity !== undefined &&
      updatedFields.stockQuantity > 0 &&
      product.stockQuantity === 0
    ) {
      try {
        const response = await notifyRestock(product._id);
        console.log(response, "response");
      } catch (err) {
        console.error("Error sending restock notifications:", err);
      }
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.log("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating product",
      error: error.message,
    });
  }
};

module.exports = {
  addProduct,
  deleteProduct,
  updateProduct,
};
