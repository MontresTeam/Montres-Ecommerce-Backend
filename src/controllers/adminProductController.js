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

    if (!productData.name) {
      return res.status(400).json({ message: "Product name is required." });
    }

    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };

    const images = productData.images || [];
    console.log(images,"images");
    

   const newProduct = new Product({
      // Basic Info
      name: productData.name,
      sku: productData.sku || "",
      serialNumber: productData.serialNumber || "",
      regularPrice: productData.regularPrice || 0,
      salePrice: productData.salePrice || 0,
      discount: productData.discount || 0,
      stockQuantity: productData.stockQuantity || 0,
      taxStatus: productData.taxStatus || "taxable",
      RefenceNumber: productData.RefenceNumber || "",
      description: productData.description || "",
      published: productData.published ?? true,
      featured: productData.featured ?? false,
      inStock: productData.inStock ?? true,

      // Collection & Classification
      categories: productData.categories || "",
      subcategory: productData.subcategory || "",
      collection: productData.collection || "None",
      brands: parseJSON(productData.brands),
      tags: parseJSON(productData.tags),

      // Watch Details
      CaseDiameter: productData.CaseDiameter || 0,
      Movement: productData.Movement || "",
      Dial: productData.Dial || "",
      WristSize: productData.WristSize || 0,
      Condition: productData.Condition || "",
      ProductionYear: productData.ProductionYear || "",
      Accessories: productData.Accessories || "",

      // Misc
      gender: productData.gender || "unisex",
      images,
      meta: productData.meta || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedProduct = await newProduct.save();

    const response = await Product.findById(savedProduct._id).select(
      "name sku serialNumber regularPrice salePrice stockQuantity taxStatus RefenceNumber collection categories subcategory brands tags CaseDiameter Movement Dial WristSize Condition ProductionYear Accessories gender images description discount createdAt"
    );


    res.status(201).json({
      success: true,
      message: "Product added successfully!",
      product: response,
    });
  } catch (error) {
    console.log("Add product error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};


// ====================== UPDATE PRODUCT ======================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("Request files:", req.files);
    console.log("Request body:", req.body);
    console.log("Uploaded images:", req.body.uploadedImages);

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // ✅ Add this helper
    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };

    // **FIX: Handle images properly**
    let updatedImages = [...product.images]; // Start with existing images

    // If new images were uploaded, replace the images array
    if (req.body.uploadedImages && req.body.uploadedImages.length > 0) {
      updatedImages = req.body.uploadedImages;
    }
    // If no new images uploaded, preserve existing images (they stay as they are)

    console.log("Final images array:", updatedImages);

    const updatedFields = {
      // Basic Info
      ...(req.body.name && { name: req.body.name }),
      ...(req.body.sku && { sku: req.body.sku }),
      ...(req.body.serialNumber && { serialNumber: req.body.serialNumber }),
      ...(req.body.discount !== undefined && { discount: parseFloat(req.body.discount) || 0 }),
      regularPrice: parseFloat(req.body.regularPrice) || product.regularPrice,
      salePrice: parseFloat(req.body.salePrice) || product.salePrice,
      stockQuantity: parseInt(req.body.stockQuantity) || product.stockQuantity,
      taxStatus: req.body.taxStatus || product.taxStatus,
      RefenceNumber: req.body.RefenceNumber || product.RefenceNumber,
      description: req.body.description || product.description,
      published: req.body.published !== undefined ? req.body.published === "true" : product.published,
      featured: req.body.featured !== undefined ? req.body.featured === "true" : product.featured,
      inStock: req.body.inStock !== undefined ? req.body.inStock === "true" : product.inStock,

      // Collection & Classification
      categories: req.body.categories || product.categories,
      subcategory: req.body.subcategory || product.subcategory,
      collection: req.body.collection || product.collection,
      brands: req.body.brands ? parseJSON(req.body.brands) : product.brands,
      tags: req.body.tags ? parseJSON(req.body.tags) : product.tags,

      // Watch Details
      CaseDiameter: parseFloat(req.body.CaseDiameter) || product.CaseDiameter,
      Movement: req.body.Movement || product.Movement,
      Dial: req.body.Dial || product.Dial,
      WristSize: parseFloat(req.body.WristSize) || product.WristSize,
      Condition: req.body.Condition || product.Condition,
      ProductionYear: req.body.ProductionYear || product.ProductionYear,
      Accessories: req.body.Accessories || product.Accessories,

      // Misc
      gender: req.body.gender || product.gender,
      images: updatedImages, // **FIX: This now preserves existing images**
      updatedAt: new Date(),
    };

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedFields, {
      new: true,
      runValidators: true,
    }).select(
      "name sku serialNumber regularPrice salePrice stockQuantity taxStatus RefenceNumber collection categories subcategory brands tags CaseDiameter discount Movement Dial WristSize Condition ProductionYear Accessories gender images description updatedAt"
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
