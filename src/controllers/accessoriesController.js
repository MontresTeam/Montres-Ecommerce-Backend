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
      published = true
    } = req.query;

    // Base filter - only accessories
    let filter = { category: "Accessories" };

    // Filter by published status (default: true)
    if (published !== undefined) {
      filter.published = published === 'true';
    }

    // Filter by accessory category
    if (category) {
      filter.accessoryCategory = category;
    }

    // Filter by accessory subcategory
    if (subcategory) {
      filter.accessorySubCategory = subcategory;
    }

    // Filter by brand
    if (brand) {
      filter.brand = { $regex: brand, $options: 'i' };
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      filter.$or = [
        { salePrice: {} },
        { regularPrice: {} },
        { retailPrice: {} },
        { sellingPrice: {} }
      ];
      
      if (minPrice) {
        const minPriceNum = parseFloat(minPrice);
        filter.$or[0].salePrice.$gte = minPriceNum;
        filter.$or[1].regularPrice.$gte = minPriceNum;
        filter.$or[2].retailPrice.$gte = minPriceNum;
        filter.$or[3].sellingPrice.$gte = minPriceNum;
      }
      
      if (maxPrice) {
        const maxPriceNum = parseFloat(maxPrice);
        if (!filter.$or[0].salePrice.$gte) filter.$or[0].salePrice = {};
        if (!filter.$or[1].regularPrice.$gte) filter.$or[1].regularPrice = {};
        if (!filter.$or[2].retailPrice.$gte) filter.$or[2].retailPrice = {};
        if (!filter.$or[3].sellingPrice.$gte) filter.$or[3].sellingPrice = {};
        
        filter.$or[0].salePrice.$lte = maxPriceNum;
        filter.$or[1].regularPrice.$lte = maxPriceNum;
        filter.$or[2].retailPrice.$lte = maxPriceNum;
        filter.$or[3].sellingPrice.$lte = maxPriceNum;
      }
    }

    // Filter by condition
    if (condition) {
      filter.condition = condition;
    }

    // Filter by gender
    if (gender) {
      filter.gender = gender;
    }

    // Filter by material (array field)
    if (material) {
      filter.accessoryMaterial = { $in: Array.isArray(material) ? material : [material] };
    }

    // Filter by color (array field)
    if (color) {
      filter.accessoryColor = { $in: Array.isArray(color) ? color : [color] };
    }

    // Filter by inStock status
    if (inStock !== undefined) {
      filter.inStock = inStock === 'true';
    }

    // Filter by featured status
    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    // Filter by badges
    if (badges) {
      filter.badges = { $in: Array.isArray(badges) ? badges : [badges] };
    }

    // Text search across multiple fields
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { accessoryName: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sortOptions = {};
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'salePrice', 'regularPrice', 'sellingPrice', 'retailPrice'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalProducts = await Product.countDocuments(filter);

    // Get products with pagination and sorting
    const products = await Product.find(filter)
      .select('name accessoryName accessoryCategory accessorySubCategory brand model images salePrice regularPrice retailPrice sellingPrice stockQuantity inStock condition itemCondition badges featured published createdAt updatedAt')
      .skip(skip)
      .limit(limitNum)
      .sort(sortOptions);

    // Get aggregation data for filters
    const categoryAggregation = await Product.aggregate([
      { $match: { category: "Accessories", published: true } },
      { $group: { _id: "$accessoryCategory", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const brandAggregation = await Product.aggregate([
      { $match: { category: "Accessories", published: true, brand: { $ne: null } } },
      { $group: { _id: "$brand", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const priceRangeAggregation = await Product.aggregate([
      { $match: { category: "Accessories", published: true } },
      {
        $project: {
          price: {
            $cond: [
              { $and: [{ $gt: ["$salePrice", 0] }] },
              "$salePrice",
              {
                $cond: [
                  { $and: [{ $gt: ["$sellingPrice", 0] }] },
                  "$sellingPrice",
                  {
                    $cond: [
                      { $and: [{ $gt: ["$regularPrice", 0] }] },
                      "$regularPrice",
                      "$retailPrice"
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: "$price",
          boundaries: [0, 100, 500, 1000, 5000, 10000],
          default: "10000+",
          output: {
            count: { $sum: 1 },
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" }
          }
        }
      }
    ]);

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
        priceRanges: priceRangeAggregation
      }
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
        message: "Invalid accessory ID format"
      });
    }

    const product = await Product.findOne({
      _id: id,
      category: "Accessories"
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Accessory not found"
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
        { accessorySubCategory: product.accessorySubCategory }
      ]
    })
    .limit(4)
    .select('name accessoryName accessoryCategory brand images salePrice sellingPrice regularPrice retailPrice');

    res.status(200).json({
      success: true,
      data: {
        accessory: product,
        relatedAccessories
      }
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

// ============================================
// CREATE NEW ACCESSORY
// ============================================
const createAccessory = async (req, res) => {
  try {
    const {
      // Basic info 
      brand,
      model,
      name,
      sku,
      referenceNumber,
      serialNumber,
      additionalTitle,
    
      // Category info
      accessoryCategory,
      accessorySubCategory,
      
      // Year info
      productionYear,
      approximateYear,
      unknownYear,
      
      // Condition info
      condition,
      itemCondition,
      
      // Specifications
      accessoryMaterial,
      accessoryColor,
      gender,
      
      // Delivery & Accessories
      accessoryDelivery,
      accessoryScopeOfDelivery,
      
      // Pricing
      retailPrice,
      sellingPrice,
      taxStatus = "taxable",
      
      // Inventory
      stockQuantity = 0,
      inStock,
      
      // Marketing
      badges = [],
      featured = false,
      
      // Media
      images,
      
      // SEO
      seoTitle,
      seoDescription,
      seoKeywords,
      
      // Content
      description,
      
      // Visibility
      visibility = "visible",
      published = true,
      
      // Meta fields
      meta
    } = req.body;

    // Validation
    if (!accessoryCategory) {
      return res.status(400).json({
        success: false,
        message: "Accessory category is required",
      });
    }

    if (!brand && !name) {
      return res.status(400).json({
        success: false,
        message: "Either brand or name is required",
      });
    }

    // Check for duplicate SKU if provided
    if (sku) {
      const existingProduct = await Product.findOne({ sku, category: "Accessories" });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists for another accessory"
        });
      }
    }

    // Handle unknownYear logic
    let finalProductionYear = productionYear;
    if (unknownYear === true) {
      finalProductionYear = "unknown";
    }

    // Generate name if not provided
    const productName = name || `${brand} ${model || ''}`.trim();

    // Determine inStock status
    const stockStatus = inStock !== undefined ? inStock : (stockQuantity > 0);

    // Create new product as accessory
    const newProduct = new Product({
      // Core product info
      name: productName,
      category: "Accessories",
      
      // Basic info
      brand: brand || null,
      model: model || null,
      sku: sku || `ACC-${Date.now()}`,
      referenceNumber,
      serialNumber,
      additionalTitle,
      
      // Accessory specific
      accessoryCategory,
      accessorySubCategory: accessorySubCategory || null,
      accessoryName: productName,
      accessoryMaterial: accessoryMaterial || [],
      accessoryColor: accessoryColor || [],
      accessoryDelivery: accessoryDelivery || [],
      accessoryScopeOfDelivery: accessoryScopeOfDelivery || [],
      
      // Year
      productionYear: finalProductionYear,
      approximateYear: approximateYear || false,
      unknownYear: unknownYear || false,
      
      // Condition
      condition: condition || null,
      itemCondition: itemCondition || null,
      
      // Gender
      gender: gender || "Men/Unisex",
      
      // Pricing - ensure both pricing models are set
      retailPrice: retailPrice || 0,
      sellingPrice: sellingPrice || retailPrice || 0,
      taxStatus,
      
      // Inventory
      stockQuantity,
      inStock: stockStatus,
      
      // Marketing
      badges,
      featured,
      
      // Media
      images: images || [],
      
      // SEO
      seoTitle: seoTitle || productName,
      seoDescription: seoDescription || `Buy ${productName} - Premium ${accessoryCategory}`,
      seoKeywords: seoKeywords || [accessoryCategory, brand, productName].filter(Boolean),
      
      // Content
      description: description || `Premium ${accessoryCategory}${brand ? ` by ${brand}` : ''}`,
      
      // Visibility
      visibility,
      published,
      
      // Meta
      meta: meta || {}
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Accessory created successfully",
      data: savedProduct,
    });

  } catch (error) {
    console.error("Error creating accessory:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate entry found. ${field} already exists.`,
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE ACCESSORY
// ============================================
const updateAccessory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format"
      });
    }

    // First, verify the product exists and is an accessory
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

    // Define allowed updates
    const updateData = { ...req.body };

    // Handle unknownYear logic
    if (updateData.unknownYear === true) {
      updateData.productionYear = "unknown";
    } else if (updateData.unknownYear === false && updateData.productionYear === "unknown") {
      // If unknownYear is set to false but productionYear is still "unknown", clear it
      updateData.productionYear = null;
    }

    // Update accessoryName if name is updated
    if (updateData.name && !updateData.accessoryName) {
      updateData.accessoryName = updateData.name;
    }

    // Update pricing consistency
    if (updateData.regularPrice !== undefined && updateData.salePrice === undefined) {
      updateData.salePrice = updateData.regularPrice;
    }
    
    if (updateData.retailPrice !== undefined && updateData.sellingPrice === undefined) {
      updateData.sellingPrice = updateData.retailPrice;
    }

    // Update stock status
    if (updateData.stockQuantity !== undefined) {
      updateData.inStock = updateData.stockQuantity > 0;
    }

    // Check for duplicate SKU if updating
    if (updateData.sku && updateData.sku !== existingProduct.sku) {
      const existingWithSKU = await Product.findOne({ 
        sku: updateData.sku, 
        category: "Accessories",
        _id: { $ne: id }
      });
      if (existingWithSKU) {
        return res.status(400).json({
          success: false,
          message: "SKU already exists for another accessory"
        });
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

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
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `Duplicate entry found. ${field} already exists.`,
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    
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
        message: "Invalid accessory ID format"
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
        visibility: "hidden"
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
// HARD DELETE ACCESSORY (PERMANENT)
// ============================================
const hardDeleteAccessory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format"
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

    // Permanent delete
    await Product.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Accessory permanently deleted",
    });

  } catch (error) {
    console.error("Error hard deleting accessory:", error);
    res.status(500).json({
      success: false,
      message: "Server error, could not delete accessory",
      error: error.message,
    });
  }
};

// ============================================
// TOGGLE ACCESSORY FEATURED STATUS
// ============================================
const toggleFeaturedAccessory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format"
      });
    }

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

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { featured: !existingProduct.featured },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Accessory ${updatedProduct.featured ? 'marked as' : 'removed from'} featured`,
      data: updatedProduct,
    });

  } catch (error) {
    console.error("Error toggling featured status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// TOGGLE ACCESSORY PUBLISHED STATUS
// ============================================
const togglePublishedAccessory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format"
      });
    }

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

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { published: !existingProduct.published },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Accessory ${updatedProduct.published ? 'published' : 'unpublished'}`,
      data: updatedProduct,
    });

  } catch (error) {
    console.error("Error toggling published status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE ACCESSORY STOCK
// ============================================
const updateAccessoryStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stockQuantity, inStock } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID format"
      });
    }

    if (stockQuantity === undefined && inStock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Either stockQuantity or inStock must be provided"
      });
    }

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

    const updateData = {};
    
    if (stockQuantity !== undefined) {
      updateData.stockQuantity = stockQuantity;
      updateData.inStock = stockQuantity > 0;
    }
    
    if (inStock !== undefined && stockQuantity === undefined) {
      updateData.inStock = inStock;
      // If setting to inStock but quantity is 0, set to 1
      if (inStock && existingProduct.stockQuantity === 0) {
        updateData.stockQuantity = 1;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Accessory stock updated successfully",
      data: updatedProduct,
    });

  } catch (error) {
    console.error("Error updating accessory stock:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// BULK UPDATE ACCESSORIES
// ============================================
const bulkUpdateAccessories = async (req, res) => {
  try {
    const { ids, updateData } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IDs array is required"
      });
    }

    if (!updateData || typeof updateData !== 'object') {
      return res.status(400).json({
        success: false,
        message: "updateData object is required"
      });
    }

    // Validate all IDs
    const invalidIds = ids.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid accessory ID(s) found",
        invalidIds
      });
    }

    // Verify all products are accessories
    const products = await Product.find({ 
      _id: { $in: ids },
      category: "Accessories" 
    });

    if (products.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: "Some IDs do not belong to accessories or do not exist"
      });
    }

    // Handle stock updates
    if (updateData.stockQuantity !== undefined) {
      updateData.inStock = updateData.stockQuantity > 0;
    }

    // Handle pricing consistency
    if (updateData.regularPrice !== undefined && updateData.salePrice === undefined) {
      updateData.salePrice = updateData.regularPrice;
    }
    
    if (updateData.retailPrice !== undefined && updateData.sellingPrice === undefined) {
      updateData.sellingPrice = updateData.retailPrice;
    }

    // Perform bulk update
    const result = await Product.updateMany(
      { _id: { $in: ids } },
      updateData,
      { runValidators: true }
    );

    // Get updated products
    const updatedProducts = await Product.find({ _id: { $in: ids } });

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} accessories updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        accessories: updatedProducts
      }
    });

  } catch (error) {
    console.error("Error in bulk update accessories:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// GET ACCESSORY STATISTICS
// ============================================
const getAccessoryStatistics = async (req, res) => {
  try {
    const [
      totalAccessories,
      publishedAccessories,
      outOfStockAccessories,
      featuredAccessories,
      categoryStats,
      brandStats,
      priceStats,
      monthlyAdded
    ] = await Promise.all([
      // Total accessories
      Product.countDocuments({ category: "Accessories" }),
      
      // Published accessories
      Product.countDocuments({ category: "Accessories", published: true }),
      
      // Out of stock accessories
      Product.countDocuments({ category: "Accessories", inStock: false }),
      
      // Featured accessories
      Product.countDocuments({ category: "Accessories", featured: true }),
      
      // Category statistics
      Product.aggregate([
        { $match: { category: "Accessories" } },
        { $group: { 
          _id: "$accessoryCategory", 
          count: { $sum: 1 },
          published: { $sum: { $cond: ["$published", 1, 0] } },
          inStock: { $sum: { $cond: ["$inStock", 1, 0] } }
        }},
        { $sort: { count: -1 } }
      ]),
      
      // Brand statistics (top 10)
      Product.aggregate([
        { $match: { category: "Accessories", brand: { $ne: null } } },
        { $group: { 
          _id: "$brand", 
          count: { $sum: 1 },
          avgPrice: { $avg: { $cond: [{ $gt: ["$salePrice", 0] }, "$salePrice", "$regularPrice"] } }
        }},
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Price statistics
      Product.aggregate([
        { $match: { category: "Accessories" } },
        {
          $project: {
            price: {
              $cond: [
                { $and: [{ $gt: ["$salePrice", 0] }] },
                "$salePrice",
                "$regularPrice"
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            minPrice: { $min: "$price" },
            maxPrice: { $max: "$price" },
            avgPrice: { $avg: "$price" },
            totalValue: { $sum: { $multiply: ["$price", "$stockQuantity"] } }
          }
        }
      ]),
      
      // Monthly added accessories (last 6 months)
      Product.aggregate([
        { $match: { category: "Accessories" } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": -1, "_id.month": -1 } },
        { $limit: 6 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalAccessories,
        published: publishedAccessories,
        outOfStock: outOfStockAccessories,
        featured: featuredAccessories,
        categories: categoryStats,
        topBrands: brandStats,
        priceStatistics: priceStats[0] || {},
        monthlyAdded: monthlyAdded.reverse()
      }
    });

  } catch (error) {
    console.error("Error getting accessory statistics:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// SEARCH ACCESSORIES
// ============================================
const searchAccessories = async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters long"
      });
    }

    const products = await Product.find(
      {
        category: "Accessories",
        published: true,
        $text: { $search: q }
      },
      { score: { $meta: "textScore" } }
    )
    .select('name accessoryName accessoryCategory brand images salePrice sellingPrice')
    .sort({ score: { $meta: "textScore" } })
    .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });

  } catch (error) {
    console.error("Error searching accessories:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// GET ACCESSORIES BY CATEGORY
// ============================================
const getAccessoriesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10, featured } = req.query;

    let filter = {
      category: "Accessories",
      published: true,
      accessoryCategory: category
    };

    if (featured === 'true') {
      filter.featured = true;
    }

    const accessories = await Product.find(filter)
      .select('name accessoryName accessoryCategory accessorySubCategory brand images salePrice sellingPrice regularPrice retailPrice featured')
      .limit(parseInt(limit))
      .sort({ featured: -1, createdAt: -1 });

    // Get category info
    const categoryStats = await Product.aggregate([
      { $match: { category: "Accessories", accessoryCategory: category } },
      { $group: {
        _id: "$accessorySubCategory",
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        category,
        accessories,
        subcategories: categoryStats,
        total: accessories.length
      }
    });

  } catch (error) {
    console.error("Error getting accessories by category:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// GET FEATURED ACCESSORIES
// ============================================
const getFeaturedAccessories = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const accessories = await Product.find({
      category: "Accessories",
      published: true,
      featured: true
    })
    .select('name accessoryName accessoryCategory brand images salePrice sellingPrice regularPrice retailPrice')
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accessories.length,
      data: accessories
    });

  } catch (error) {
    console.error("Error getting featured accessories:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// GET NEW ARRIVALS ACCESSORIES
// ============================================
const getNewArrivalsAccessories = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get accessories added in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const accessories = await Product.find({
      category: "Accessories",
      published: true,
      createdAt: { $gte: thirtyDaysAgo }
    })
    .select('name accessoryName accessoryCategory brand images salePrice sellingPrice regularPrice retailPrice badges createdAt')
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accessories.length,
      data: accessories
    });

  } catch (error) {
    console.error("Error getting new arrivals accessories:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
module.exports = {
  getAccessoriesProducts,       // Get all with filtering & pagination
  getAccessoryById,             // Get single by ID
  createAccessory,              // Create new accessory
  updateAccessory,              // Update accessory
  deleteAccessory,              // Soft delete
  hardDeleteAccessory,          // Permanent delete
  toggleFeaturedAccessory,      // Toggle featured status
  togglePublishedAccessory,     // Toggle published status
  updateAccessoryStock,         // Update stock
  bulkUpdateAccessories,        // Bulk update
  getAccessoryStatistics,       // Get statistics
  searchAccessories,            // Search
  getAccessoriesByCategory,     // Get by category
  getFeaturedAccessories,       // Get featured
  getNewArrivalsAccessories     // Get new arrivals
};