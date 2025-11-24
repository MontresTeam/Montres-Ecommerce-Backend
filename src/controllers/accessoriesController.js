const Product = require("../models/product");
const Accessory = require('../models/AccessoriesModel')
const getAccessoriesProducts = async (req, res) => {
  try {
    const { id, page = 1, limit = 15, subcatory } = req.query;
    const { category } = req.params;
    const categorisOne = "Accessories";

    // ✅ Base filter
    let filter = { categorisOne };

    // ✅ If main category provided (like "classic", "sports", etc.)
    if (category) {
      filter.subcategory = { $in: [category] };
    }

    // ✅ If subcatory query param also provided
    if (subcatory) {
      filter.subcategory = { $in: [subcatory] };
    }

    // ✅ If searching by product ID
    if (id) {
      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({ message: "❌ Product not found" });
      }

      if (product.categorisOne !== categorisOne) {
        return res.status(400).json({ message: "❌ Product is not a watch" });
      }

      return res.json(product);
    }

    // ✅ Convert pagination numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // ✅ Count total products
    const totalProducts = await Product.countDocuments(filter);


    // ✅ Fetch paginated products
    const products = await Product.find(filter)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.json({
      totalProducts,
      totalPages: Math.ceil(totalProducts / limitNum),
      currentPage: pageNum,
      products,
    });
  } catch (err) {
    res.status(500).json({
      message: "❌ Error fetching watches",
      error: err.message,
    });
  }
};


// ---------------- Add Accessory ----------------
const Addaccessories = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      brand,
      model,
      additionalTitle,
      serialNumber,
      productionYear,
      approximateYear,
      unknownYear,
      gender,
      condition,
      itemCondition,
      material,
      color,
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
    } = req.body;

    // Validation
    if (!category || !subCategory || !brand || !model) {
      return res.status(400).json({
        message: "Category, SubCategory, Brand and Model are required",
      });
    }

    // Handle unknownYear logic
    const finalProductionYear = unknownYear ? "unknown" : productionYear;

    const newAccessory = new Accessory({
      category,
      subCategory,
      brand,
      model,
      additionalTitle,
      serialNumber,
      productionYear: finalProductionYear,
      approximateYear,
      unknownYear,
      gender,
      condition,
      itemCondition,
      material,
      color,
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
    });

    const savedAccessory = await newAccessory.save();

    res.status(201).json({
      success: true,
      message: "Accessory added successfully",
      data: savedAccessory,
    });

  } catch (error) {
    console.error("Error adding accessory:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// ---------------- Update Accessory ----------------
const updateAccessories = async (req, res) => {
  try {
    const accessoryId = req.params.id;

    const allowedUpdates = [
      "category",
      "subCategory",
      "brand",
      "model",
      "additionalTitle",
      "serialNumber",
      "productionYear",
      "approximateYear",
      "unknownYear",
      "gender",
      "condition",
      "itemCondition",
      "material",
      "color",
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
    ];

    // Filter only allowed fields
    const updateData = {};
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle unknownYear logic before saving
    if (updateData.unknownYear === true) {
      updateData.productionYear = "unknown";
    }

    const updatedAccessory = await Accessory.findByIdAndUpdate(
      accessoryId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedAccessory) {
      return res.status(404).json({
        success: false,
        message: "Accessory not found",
      });
    }

    // Ensure response reflects unknownYear logic
    const responseAccessory = updatedAccessory.toObject();
    if (responseAccessory.unknownYear === true) {
      responseAccessory.productionYear = "unknown";
    }

    res.status(200).json({
      success: true,
      message: "Accessory updated successfully",
      data: responseAccessory,
    });

  } catch (error) {
    console.error("Error updating accessory:", error);
    res.status(500).json({
      success: false,
      message: "Server error, could not update accessory",
      error: error.message,
    });
  }
};


module.exports = { getAccessoriesProducts, Addaccessories, updateAccessories };