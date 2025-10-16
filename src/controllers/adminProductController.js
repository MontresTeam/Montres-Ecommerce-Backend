const Product = require("../models/product");


const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
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

    // Basic validation
    if (!productData.name) {
      return res.status(400).json({ message: "Product name is required." });
    }

    // Helper: safely parse JSON if it’s sent as string
    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };

    // Prepare product data
    const newProduct = new Product({
      name: productData.name,
      type: productData.type || "simple",
      sku: productData.sku || "",
      gtin: productData.gtin || "",
      shortDescription: productData.shortDescription || "",
      description: productData.description || "",
      salePrice: productData.salePrice || 0,
      regularPrice: productData.regularPrice || 0,
      stockQuantity: productData.stockQuantity || 0,
      inStock: productData.inStock ?? true,
      featured: productData.featured ?? false,
      published: productData.published ?? true,
      gender: productData.gender || "unisex",
      categorisOne: productData.categorisOne || "",
      subcategory: parseJSON(productData.subcategory),
      categories: parseJSON(productData.categories),
      brands: parseJSON(productData.brands),
      tags: parseJSON(productData.tags),
      attributes: parseJSON(productData.attributes),
      images: productData.images || [],
      meta: productData.meta || {},
      weight: productData.weight || 0,
      height: productData.height || 0,
      width: productData.width || 0,
      length: productData.length || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Save product
    const savedProduct = await newProduct.save();

    // Select only relevant fields for response
    const response = await Product.findById(savedProduct._id).select(
      "name salePrice regularPrice images meta brands stockQuantity gender createdAt categorisOne"
    );

    res.status(201).json({
      message: "Product added successfully!",
      product: response,
    });
  } catch (error) {
    console.error("Add product error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;

    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Helper: safely parse JSON fields if they come as strings
    const parseJSON = (field) => {
      if (!field) return [];
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return Array.isArray(field) ? field : [field];
      }
    };
    
    console.log(productData,'prdocts')
    // Update only provided fields (prevent overwriting with undefined)
    const updatedFields = {
      ...(productData.name && { name: productData.name }),
      ...(productData.type && { type: productData.type }),
      ...(productData.sku && { sku: productData.sku }),
      ...(productData.gtin && { gtin: productData.gtin }),
      ...(productData.shortDescription && {
        shortDescription: productData.shortDescription,
      }),
      ...(productData.description && { description: productData.description }),
      ...(productData.salePrice !== undefined && {
        salePrice: productData.salePrice,
      }),
      ...(productData.regularPrice !== undefined && {
        regularPrice: productData.regularPrice,
      }),
      ...(productData.stockQuantity !== undefined && {
        stockQuantity: productData.stockQuantity,
      }),
      ...(productData.inStock !== undefined && {
        inStock: productData.inStock,
      }),
      ...(productData.featured !== undefined && {
        featured: productData.featured,
      }),
      ...(productData.published !== undefined && {
        published: productData.published,
      }),
      ...(productData.gender && { gender: productData.gender }),
      ...(productData.categorisOne && {
        categorisOne: productData.categorisOne,
      }),
      subcategory: parseJSON(productData.subcategory),
      categories: parseJSON(productData.categories),
      brands: parseJSON(productData.brands),
      tags: parseJSON(productData.tags),
      attributes: parseJSON(productData.attributes),
      images:product.images,
      meta: productData.meta || product.meta,
      weight: productData.weight ?? product.weight,
      height: productData.height ?? product.height,
      width: productData.width ?? product.width,
      length: productData.length ?? product.length,
      updatedAt: new Date(),
    };

    // Update in DB
    const updatedProduct = await Product.findByIdAndUpdate(id, updatedFields, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validations
    }).select(
      "name salePrice regularPrice images meta brands stockQuantity gender createdAt categorisOne"
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating product",
      error: error.message,
    });
  }
};


module.exports={
    addProduct,deleteProduct,updateProduct
}