const Product = require("../models/product");

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
    
   console.log("Images received:", req.body.images);


    // Required field validation
    if (!productData.brand || !productData.model) {
      return res.status(400).json({ 
        message: "Brand and model are required fields." 
      });
    }

    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };

    const parseNumber = (value) => {
      if (value === undefined || value === null) return 0;
      return parseFloat(value) || 0;
    };

    const parseInteger = (value) => {
      if (value === undefined || value === null) return 0;
      return parseInt(value) || 0;
    };

    // Generate name from brand and model if not provided
    const productName = productData.name || `${productData.brand} ${productData.model}`;



    

    const newProduct = new Product({
      // ────────────── BASIC INFORMATION ──────────────
      brand: productData.brand,
      model: productData.model,
      name: productName,
      sku: productData.sku || "",
      referenceNumber: productData.referenceNumber || "",
      serialNumber: productData.serialNumber || "",
      additionalTitle: productData.additionalTitle || "",
      watchType: productData.watchType || "",
      scopeOfDelivery: productData.scopeOfDelivery || "",
      includedAccessories: productData.includedAccessories || "",
      category: productData.category || "",

      // ────────────── ITEM FEATURES ──────────────
      productionYear: productData.productionYear || "",
      approximateYear: productData.approximateYear || false,
      unknownYear: productData.unknownYear || false,
      gender: productData.gender || "Men/Unisex",
      movement: productData.movement || "",
      dialColor: productData.dialColor || "",
      caseMaterial: productData.caseMaterial || "",
      strapMaterial: productData.strapMaterial || "",

      // ────────────── ADDITIONAL INFORMATION ──────────────
      strapColor: productData.strapColor || "",
      strapSize: parseNumber(productData.strapSize),
      caseSize: parseNumber(productData.caseSize),
      caseColor: productData.caseColor || "",
      crystal: productData.crystal || "",
      bezelMaterial: productData.bezelMaterial || "",
      dialNumerals: productData.dialNumerals || "No Numerals",
      caliber: productData.caliber || "",
      powerReserve: parseNumber(productData.powerReserve),
      jewels: parseInteger(productData.jewels),
      functions: parseJSON(productData.functions),
      condition: productData.condition || "",
      replacementParts: parseJSON(productData.replacementParts),

      // ────────────── PRICING & INVENTORY ──────────────
      regularPrice: parseNumber(productData.regularPrice),
      salePrice: parseNumber(productData.salePrice),
      taxStatus: productData.taxStatus || "taxable",
      stockQuantity: parseInteger(productData.stockQuantity),

      // ────────────── DESCRIPTION & META ──────────────
      description: productData.description || "",
      visibility: productData.visibility || "visible",

      // ────────────── SEO FIELDS ──────────────
      seoTitle: productData.seoTitle || "",
      seoDescription: productData.seoDescription || "",
      seoKeywords: parseJSON(productData.seoKeywords),

      // ────────────── CORE PRODUCT INFO ──────────────
      published: productData.published ?? true,
      featured: productData.featured ?? false,
      inStock: productData.inStock ?? true,

       // ────────────── MEDIA ──────────────
      images, // ✅ Cloudinary images here

      // ────────────── META & ATTRIBUTES ──────────────
      meta: productData.meta || {},
      attributes: productData.attributes || [],

      // ────────────── TRACKING ──────────────
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedProduct = await newProduct.save();



    // SELECTED RESPONSE FIELDS
    const response = await Product.findById(savedProduct._id).select(
      "brand model name sku referenceNumber serialNumber watchType scopeOfDelivery " +
      "productionYear gender movement dialColor caseMaterial strapMaterial strapColor dialNumerals " +
      "regularPrice salePrice stockQuantity taxStatus strapSize caseSize includedAccessories" +
      "condition category description visibility published featured inStock " +
      "images createdAt updatedAt"
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
      message: error.message || "Server error" 
    });
  }
};


// ====================== UPDATE PRODUCT ======================
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
        message: "Product not found" 
      });
    }

    // Helper functions
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

    // **FIX: Handle images based on your schema structure**
    let updatedImages = [...(product.images || [])]; // Start with existing images

    // If new images were uploaded via multer middleware
    if (req.body.images && req.body.images.length > 0) {
      // Replace images array with new uploaded images
      updatedImages = req.body.images;
    }
    // If images are sent via request body (for manual updates)
    else if (req.body.uploadedImages) {
      const parsedImages = parseJSON(req.body.uploadedImages);
      if (parsedImages.length > 0) {
        updatedImages = parsedImages;
      }
    }

    console.log("Final images array:", updatedImages);

    // Generate name from brand and model if not provided
    let productName = product.name;
    if (req.body.brand || req.body.model) {
      const brand = req.body.brand || product.brand;
      const model = req.body.model || product.model;
      productName = `${brand} ${model}`;
    }

    const updatedFields = {
      // ────────────── BASIC INFORMATION ──────────────
      ...(req.body.brand && { brand: req.body.brand }),
      ...(req.body.model && { model: req.body.model }),
      name: productName,
      ...(req.body.sku !== undefined && { sku: req.body.sku }),
      ...(req.body.referenceNumber !== undefined && { referenceNumber: req.body.referenceNumber }),
      ...(req.body.serialNumber !== undefined && { serialNumber: req.body.serialNumber }),
      ...(req.body.additionalTitle !== undefined && { additionalTitle: req.body.additionalTitle }),
      ...(req.body.watchType !== undefined && { watchType: req.body.watchType }),
      ...(req.body.scopeOfDelivery !== undefined && { scopeOfDelivery: req.body.scopeOfDelivery }),
      ...(req.body.includedAccessories !== undefined && { includedAccessories: req.body.includedAccessories }),
      ...(req.body.category !== undefined && { category: req.body.category }),


      // ────────────── ITEM FEATURES ──────────────
      ...(req.body.productionYear !== undefined && { productionYear: req.body.productionYear }),
      ...(req.body.approximateYear !== undefined && { approximateYear: parseBoolean(req.body.approximateYear) }),
      ...(req.body.unknownYear !== undefined && { unknownYear: parseBoolean(req.body.unknownYear) }),
      ...(req.body.gender !== undefined && { gender: req.body.gender }),
      ...(req.body.movement !== undefined && { movement: req.body.movement }),
      ...(req.body.dialColor !== undefined && { dialColor: req.body.dialColor }),
      ...(req.body.caseMaterial !== undefined && { caseMaterial: req.body.caseMaterial }),
      ...(req.body.strapMaterial !== undefined && { strapMaterial: req.body.strapMaterial }),

      // ────────────── ADDITIONAL INFORMATION ──────────────
      ...(req.body.strapColor !== undefined && { strapColor: req.body.strapColor }),
      ...(req.body.strapSize !== undefined && { strapSize: parseNumber(req.body.strapSize) }),
      ...(req.body.caseSize !== undefined && { caseSize: parseNumber(req.body.caseSize) }),
      ...(req.body.caseColor !== undefined && { caseColor: req.body.caseColor }),
      ...(req.body.crystal !== undefined && { crystal: req.body.crystal }),
      ...(req.body.bezelMaterial !== undefined && { bezelMaterial: req.body.bezelMaterial }),
      ...(req.body.dialNumerical !== undefined && { dialNumerical: req.body.dialNumerical }),
      ...(req.body.caliber !== undefined && { caliber: req.body.caliber }),
      ...(req.body.powerReserve !== undefined && { powerReserve: parseNumber(req.body.powerReserve) }),
      ...(req.body.jewels !== undefined && { jewels: parseInteger(req.body.jewels) }),
      ...(req.body.functions !== undefined && { functions: parseJSON(req.body.functions) }),
      ...(req.body.condition !== undefined && { condition: req.body.condition }),
      ...(req.body.replacementParts !== undefined && { replacementParts: parseJSON(req.body.replacementParts) }),

      // ────────────── PRICING & INVENTORY ──────────────
      ...(req.body.regularPrice !== undefined && { regularPrice: parseNumber(req.body.regularPrice) }),
      ...(req.body.salePrice !== undefined && { salePrice: parseNumber(req.body.salePrice) }),
      ...(req.body.taxStatus !== undefined && { taxStatus: req.body.taxStatus }),
      ...(req.body.stockQuantity !== undefined && { stockQuantity: parseInteger(req.body.stockQuantity) }),

      // ────────────── DESCRIPTION & META ──────────────
      ...(req.body.description !== undefined && { description: req.body.description }),
      ...(req.body.visibility !== undefined && { visibility: req.body.visibility }),

      // ────────────── SEO FIELDS ──────────────
      ...(req.body.seoTitle !== undefined && { seoTitle: req.body.seoTitle }),
      ...(req.body.seoDescription !== undefined && { seoDescription: req.body.seoDescription }),
      ...(req.body.seoKeywords !== undefined && { seoKeywords: parseJSON(req.body.seoKeywords) }),

      // ────────────── CORE PRODUCT INFO ──────────────
      ...(req.body.published !== undefined && { published: parseBoolean(req.body.published) }),
      ...(req.body.featured !== undefined && { featured: parseBoolean(req.body.featured) }),
      ...(req.body.inStock !== undefined && { inStock: parseBoolean(req.body.inStock) }),

      // ────────────── MEDIA ──────────────
      images: updatedImages, // This uses your image schema structure

      // ────────────── META & ATTRIBUTES ──────────────
      ...(req.body.meta !== undefined && { meta: req.body.meta }),
      ...(req.body.attributes !== undefined && { attributes: req.body.attributes }),

      // ────────────── TRACKING ──────────────
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(updatedFields).forEach(key => {
      if (updatedFields[key] === undefined) {
        delete updatedFields[key];
      }
    });

    // SELECTED RESPONSE FIELDS
    const updatedProduct = await Product.findByIdAndUpdate(
      id, 
      updatedFields, 
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "brand model name sku referenceNumber serialNumber watchType scopeOfDelivery " +
      "productionYear gender movement dialColor caseMaterial strapMaterial strapColor " +
      "regularPrice salePrice stockQuantity taxStatus strapSize caseSize includedAccessories" +
      "condition description visibility published featured inStock category" +
      "images createdAt updatedAt"
    );

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
