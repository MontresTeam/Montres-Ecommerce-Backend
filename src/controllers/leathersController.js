const Product = require("../models/product");



// Get All Leather Goods
const getAllLeatherGoods = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 16,
      sortBy = "newest",
      // Filter parameters
      category,
      subCategory,
      brand,
      color,
      material,
      condition,
      gender,
      hardware,
      interiorMaterial,
      availability,
      style,
      size,
      compartment,
      minPrice,
      maxPrice,
      // Search
      search
    } = req.query;

    // ✅ Base filter - only leather goods
    let filter = { categorisOne: "leather" };

    // ✅ Category filter (from URL params or query)
    if (req.params.category && req.params.category !== 'All') {
      filter.category = req.params.category;
    } else if (category) {
      // Also support category from query params
      if (Array.isArray(category)) {
        filter.category = { $in: category };
      } else {
        filter.category = category;
      }
    }

    // ✅ Subcategory filter
    if (subCategory) {
      if (Array.isArray(subCategory)) {
        filter.leatherSubCategory = { $in: subCategory };
      } else {
        filter.leatherSubCategory = subCategory;
      }
    }

    // ✅ Brand filter
    if (brand) {
      if (Array.isArray(brand)) {
        filter.brand = { $in: brand };
      } else {
        filter.brand = brand;
      }
    }

    // ✅ Color filter (using dialColor field)
    if (color) {
      if (Array.isArray(color)) {
        filter.dialColor = { $in: color };
      } else {
        filter.dialColor = color;
      }
    }

    // ✅ Material filter
    if (material) {
      if (Array.isArray(material)) {
        filter.leatherMaterial = { $in: material };
      } else {
        filter.leatherMaterial = material;
      }
    }

    // ✅ Condition filter
    if (condition) {
      if (Array.isArray(condition)) {
        filter.condition = { $in: condition };
      } else {
        filter.condition = condition;
      }
    }

    // ✅ Gender filter
    if (gender) {
      if (Array.isArray(gender)) {
        filter.gender = { $in: gender };
      } else {
        filter.gender = gender;
      }
    }

    // ✅ Hardware filter
    if (hardware) {
      if (Array.isArray(hardware)) {
        filter.hardwareColor = { $in: hardware };
      } else {
        filter.hardwareColor = hardware;
      }
    }

    // ✅ Interior Material filter
    if (interiorMaterial) {
      if (Array.isArray(interiorMaterial)) {
        filter.interiorMaterial = { $in: interiorMaterial };
      } else {
        filter.interiorMaterial = interiorMaterial;
      }
    }

    // ✅ Availability filter
    if (availability) {
      const availabilityFilter = [];
      
      if (Array.isArray(availability)) {
        availability.forEach(avail => {
          if (avail === 'in_stock') availabilityFilter.push(true);
          if (avail === 'out_of_stock') availabilityFilter.push(false);
        });
      } else {
        if (availability === 'in_stock') availabilityFilter.push(true);
        if (availability === 'out_of_stock') availabilityFilter.push(false);
      }
      
      if (availabilityFilter.length > 0) {
        filter.inStock = { $in: availabilityFilter };
      }
    }

    // ✅ Price range filter
    if (minPrice || maxPrice) {
      filter.salePrice = {};
      if (minPrice) filter.salePrice.$gte = parseInt(minPrice);
      if (maxPrice) filter.salePrice.$lte = parseInt(maxPrice);
    }

    // ✅ Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log("Leather goods filter:", filter);

    // ✅ Convert pagination numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // ✅ Build sort object
    let sortOptions = {};
    switch (sortBy) {
      case 'price_low_high':
        sortOptions = { salePrice: 1 };
        break;
      case 'price_high_low':
        sortOptions = { salePrice: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'premium':
        // Sort by brand prestige or price high to low
        sortOptions = { salePrice: -1 };
        break;
      case 'rating':
        // If you have rating field
        sortOptions = { rating: -1 };
        break;
      case 'discount':
        // Calculate discount percentage and sort
        sortOptions = { 
          $expr: { 
            $subtract: [
              { $divide: [{ $subtract: ["$regularPrice", "$salePrice"] }, "$regularPrice"] },
              1
            ]
          } 
        };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // ✅ Count total products
    const totalProducts = await Product.countDocuments(filter);

    // ✅ Fetch paginated products
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .select('-__v'); // Exclude version key

    return res.json({
      totalProducts,
      totalPages: Math.ceil(totalProducts / limitNum),
      currentPage: pageNum,
      products: products.map(product => product.toObject()),
    });
  } catch (err) {
    console.error("Error fetching leather goods:", err);
    res.status(500).json({
      message: "❌ Error fetching leather goods",
      error: err.message,
    });
  }
};

// ---------------- Add Leather Goods ----------------
const addLeathergoods = async (req, res) => {
  try {
    const {
      MainCategory,
      SubCategory,
      Brand,
      Model,
      modelCode,
      additionalTitle,
      serialNumber,
      sku,
      productionYear,
      approximateYear,
      unknownYear,
      gender,
      Material,
      interiorMaterial,
      Color,
      hardwareColor,
      condition,
      itemCondition,
      conditionNotes,
      size,
      strapLength,
      accessoriesAndDelivery,
      scopeOfDeliveryOptions,
      taxStatus,
      stockQuantity,
      inStock,
      badges,
      images,
      seoTitle,
      seoDescription,
      seoKeywords,
      retailPrice,
      sellingPrice,
      description,
    } = req.body;

    // Handle unknown year
    const finalProductionYear = unknownYear ? "unknown" : productionYear;

    // Auto-set category based on MainCategory
    let category = "Leather Goods";
    if (MainCategory === "Hand Bag" || MainCategory === "Briefcase" || MainCategory === "Pouch") {
      category = "Leather Bags";
    }

    // Generate automatic product name
    const generateProductName = () => {
      const nameParts = [];
      
      // Add Brand
      if (Brand) nameParts.push(Brand);
      
      // Add Model
      if (Model) nameParts.push(Model);

      if(MainCategory) nameParts.push(MainCategory)
   
      
      return nameParts.join(' ');
    };

    const autoGeneratedName = generateProductName();

    const newLeather = new Product({
      // Basic product fields
      category,
      brand: Brand,
      model: Model,
      name: autoGeneratedName, // Auto-generated name
      
      // Leather goods specific fields
      leatherMainCategory: MainCategory, // Map to schema field
      leatherSubCategory: SubCategory,    // Map to schema field
      modelCode,
      additionalTitle,
      serialNumber,
      sku,

      productionYear: finalProductionYear,
      approximateYear,
      unknownYear,

      gender,
      leatherMaterial: Material, // Map to schema field
      interiorMaterial,
      dialColor: Color, // Using dialColor for Color (common field)
      hardwareColor,

      condition,
      itemCondition,
      conditionNotes,

      leatherSize: size ? { // Map to schema field
        width: size.width || undefined,
        height: size.height || undefined,
        depth: size.depth || undefined,
      } : undefined,

      strapLength,

      leatherAccessories: accessoriesAndDelivery, // Map to schema field
      leatherScopeOfDelivery: scopeOfDeliveryOptions, // Map to schema field

      taxStatus,
      stockQuantity: stockQuantity || 0,
      inStock: inStock !== undefined ? inStock : true,

      badges: badges || [],
      images: images || [],

      seoTitle,
      seoDescription,
      seoKeywords,

      // Pricing - use both naming conventions for compatibility
      retailPrice,
      sellingPrice,
      regularPrice: retailPrice,
      salePrice: sellingPrice,

      description,
      
      // Set published status
      published: true,
    });

    const savedLeather = await newLeather.save();

    res.status(201).json({
      success: true,
      message: "Leather goods added successfully",
      data: savedLeather,
    });
  } catch (error) {
    console.error("Error adding leather goods:", error);
    res.status(500).json({
      success: false,
      message: "Server error, could not add leather goods",
      error: error.message,
    });
  }
};

// ---------------- Update Leather Goods ----------------
const updateLeathergoods = async (req, res) => {
  try {
    const leatherId = req.params.id;

    const allowedUpdates = [
      "MainCategory",
      "SubCategory",
      "Brand",
      "Model",
      "modelCode",
      "additionalTitle",
      "serialNumber",
      "sku",
      "productionYear",
      "approximateYear",
      "unknownYear",
      "gender",
      "Material",
      "interiorMaterial",
      "Color",
      "hardwareColor",
      "condition",
      "itemCondition",
      "conditionNotes",
      "size",
      "strapLength",
      "accessoriesAndDelivery",
      "scopeOfDeliveryOptions",
      "taxStatus",
      "stockQuantity",
      "inStock",
      "badges",
      "images",
      "seoTitle",
      "seoDescription",
      "seoKeywords",
      "retailPrice",
      "sellingPrice",
      "description",
    ];

    const updateData = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        // Map fields to schema field names
        if (field === "Brand") updateData.brand = req.body[field];
        else if (field === "Model") updateData.model = req.body[field];
        else if (field === "MainCategory") updateData.leatherMainCategory = req.body[field];
        else if (field === "SubCategory") updateData.leatherSubCategory = req.body[field];
        else if (field === "Material") updateData.leatherMaterial = req.body[field];
        else if (field === "Color") updateData.dialColor = req.body[field];
        else if (field === "accessoriesAndDelivery") updateData.leatherAccessories = req.body[field];
        else if (field === "scopeOfDeliveryOptions") updateData.leatherScopeOfDelivery = req.body[field];
        else updateData[field] = req.body[field];
      }
    });

    // Handle category update based on MainCategory
    if (updateData.leatherMainCategory) {
      if (updateData.leatherMainCategory === "Hand Bag" || updateData.leatherMainCategory === "Briefcase" || updateData.leatherMainCategory === "Pouch") {
        updateData.category = "Leather Bags";
      } else {
        updateData.category = "Leather Goods";
      }
    }

    // Unknown year logic
    if (updateData.unknownYear === true) {
      updateData.productionYear = "unknown";
      updateData.approximateYear = false;
    } else if (updateData.unknownYear === false && updateData.productionYear) {
      updateData.productionYear = updateData.productionYear;
    }

    // Update nested size object properly
    if (req.body.size) {
      updateData.leatherSize = {
        width: req.body.size.width !== undefined ? req.body.size.width : undefined,
        height: req.body.size.height !== undefined ? req.body.size.height : undefined,
        depth: req.body.size.depth !== undefined ? req.body.size.depth : undefined,
      };
    }

    // Sync pricing fields
    if (updateData.retailPrice !== undefined) {
      updateData.regularPrice = updateData.retailPrice;
    }
    if (updateData.sellingPrice !== undefined) {
      updateData.salePrice = updateData.sellingPrice;
    }

    // Auto-generate name if relevant fields are updated
    const nameUpdateFields = ['Brand', 'Model', 'MainCategory', 'SubCategory', 'additionalTitle', 'Color', 'Material'];
    const shouldUpdateName = nameUpdateFields.some(field => req.body[field] !== undefined);
    
    if (shouldUpdateName) {
      // Get current product data to generate new name
      const currentProduct = await Product.findById(leatherId);
      if (currentProduct) {
        const updatedBrand = updateData.brand || currentProduct.brand;
        const updatedModel = updateData.model || currentProduct.model;
        const updatedMainCategory = updateData.MainCategory || currentProduct.MainCategory

        const generateUpdatedName = () => {
          const nameParts = [];
          
          if (updatedBrand) nameParts.push(updatedBrand);
          if (updatedModel) nameParts.push(updatedModel);
          if (updatedMainCategory) nameParts.push(updatedMainCategory);
        
          return nameParts.join(' ');
        };

        updateData.name = generateUpdatedName();
      }
    }

    const updatedLeather = await Product.findByIdAndUpdate(
      leatherId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedLeather) {
      return res.status(404).json({
        success: false,
        message: "Leather goods not found",
      });
    }

    const responseLeather = updatedLeather.toObject();
    
    // Handle unknown year in response
    if (responseLeather.unknownYear === true) {
      responseLeather.productionYear = "unknown";
    }

    res.status(200).json({
      success: true,
      message: "Leather goods updated successfully",
      data: responseLeather,
    });
  } catch (error) {
    console.error("Error updating leather goods:", error);
    res.status(500).json({
      success: false,
      message: "Server error, could not update leather goods",
      error: error.message,
    });
  }
};

module.exports = { getAllLeatherGoods, addLeathergoods, updateLeathergoods };