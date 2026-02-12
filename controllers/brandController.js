const Product = require("../models/product");

/**
 * Get all unique brands from the database
 * Supports filtering by category (watches, bags, accessories)
 * @route GET /api/brands
 */
const getAllBrands = async (req, res) => {
    try {
        const { category } = req.query;

        // Build match condition based on category
        let matchCondition = {
            published: true,
            brand: { $exists: true, $ne: "" },
        };

        // Apply category-specific filters
        if (category) {
            const categoryLower = category.toLowerCase();

            if (categoryLower === 'watches' || categoryLower === 'watch') {
                matchCondition.category = "Watch";
            } else if (categoryLower === 'bags' || categoryLower === 'handbags' || categoryLower === 'leather-bags') {
                matchCondition.$or = [
                    { category: "Leather Bags" },
                    { category: "Leather Goods", leatherMainCategory: "Bag" }
                ];
            } else if (categoryLower === 'accessories') {
                matchCondition.category = "Accessories";
            } else {
                // If specific category provided, use it
                matchCondition.category = { $regex: new RegExp(`^${category}$`, 'i') };
            }
        }

        const brands = await Product.aggregate([
            {
                $match: matchCondition,
            },

            // Normalize brand
            {
                $project: {
                    cleanBrand: {
                        $trim: {
                            input: { $toLower: "$brand" },
                        },
                    },
                },
            },

            // Group by normalized brand
            {
                $group: {
                    _id: "$cleanBrand",
                },
            },

            // Sort A-Z
            {
                $sort: { _id: 1 },
            },
        ]);

        // Capitalize for frontend display
        const formattedBrands = brands.map((b) => ({
            name: b._id
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" "),
        }));

        res.json({
            success: true,
            totalBrands: formattedBrands.length,
            brands: formattedBrands.map((b) => b.name),
            category: category || 'all'
        });
    } catch (error) {
        console.error("❌ Error fetching brands:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching brands",
            error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message
        });
    }
};

/**
 * Get brand details with product count
 * @route GET /api/brands/:brandName
 */
const getBrandDetails = async (req, res) => {
    try {
        const { brandName } = req.params;
        const { category } = req.query;

        if (!brandName) {
            return res.status(400).json({
                success: false,
                message: "Brand name is required"
            });
        }

        // Build match condition
        let matchCondition = {
            published: true,
            brand: { $regex: new RegExp(`^${brandName}$`, "i") }
        };

        // Apply category filter if provided
        if (category) {
            const categoryLower = category.toLowerCase();

            if (categoryLower === 'watches' || categoryLower === 'watch') {
                matchCondition.category = "Watch";
            } else if (categoryLower === 'bags' || categoryLower === 'handbags' || categoryLower === 'leather-bags') {
                matchCondition.$or = [
                    { category: "Leather Bags" },
                    { category: "Leather Goods", leatherMainCategory: "Bag" }
                ];
            } else if (categoryLower === 'accessories') {
                matchCondition.category = "Accessories";
            } else {
                matchCondition.category = { $regex: new RegExp(`^${category}$`, 'i') };
            }
        }

        // Get product count and available count
        const brandStats = await Product.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    availableProducts: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $gt: ["$stockQuantity", 0] },
                                        { $eq: ["$inStock", true] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    categories: { $addToSet: "$category" }
                }
            }
        ]);

        if (!brandStats || brandStats.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Brand '${brandName}' not found${category ? ` in category '${category}'` : ''}`
            });
        }

        const stats = brandStats[0];

        res.json({
            success: true,
            brand: brandName,
            totalProducts: stats.totalProducts,
            availableProducts: stats.availableProducts,
            categories: stats.categories,
            filterCategory: category || 'all'
        });
    } catch (error) {
        console.error("❌ Error fetching brand details:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching brand details",
            error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message
        });
    }
};

/**
 * Get brands with product counts for each category
 * @route GET /api/brands/stats
 */
const getBrandsWithStats = async (req, res) => {
    try {
        const { category } = req.query;

        // Build match condition
        let matchCondition = {
            published: true,
            brand: { $exists: true, $ne: "" }
        };

        // Apply category filter if provided
        if (category) {
            const categoryLower = category.toLowerCase();

            if (categoryLower === 'watches' || categoryLower === 'watch') {
                matchCondition.category = "Watch";
            } else if (categoryLower === 'bags' || categoryLower === 'handbags' || categoryLower === 'leather-bags') {
                matchCondition.$or = [
                    { category: "Leather Bags" },
                    { category: "Leather Goods", leatherMainCategory: "Bag" }
                ];
            } else if (categoryLower === 'accessories') {
                matchCondition.category = "Accessories";
            } else {
                matchCondition.category = { $regex: new RegExp(`^${category}$`, 'i') };
            }
        }

        const brandsWithStats = await Product.aggregate([
            { $match: matchCondition },
            {
                $group: {
                    _id: {
                        $toLower: {
                            $trim: { input: "$brand" }
                        }
                    },
                    totalProducts: { $sum: 1 },
                    availableProducts: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $gt: ["$stockQuantity", 0] },
                                        { $eq: ["$inStock", true] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    categories: { $addToSet: "$category" }
                }
            },
            {
                $project: {
                    _id: 0,
                    brand: {
                        $reduce: {
                            input: { $split: ["$_id", " "] },
                            initialValue: "",
                            in: {
                                $concat: [
                                    "$$value",
                                    {
                                        $cond: [
                                            { $eq: ["$$value", ""] },
                                            "",
                                            " "
                                        ]
                                    },
                                    {
                                        $concat: [
                                            { $toUpper: { $substrCP: ["$$this", 0, 1] } },
                                            { $substrCP: ["$$this", 1, { $strLenCP: "$$this" }] }
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    totalProducts: 1,
                    availableProducts: 1,
                    categories: 1
                }
            },
            { $sort: { brand: 1 } }
        ]);

        res.json({
            success: true,
            totalBrands: brandsWithStats.length,
            brands: brandsWithStats,
            category: category || 'all'
        });
    } catch (error) {
        console.error("❌ Error fetching brands with stats:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching brands with statistics",
            error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message
        });
    }
};

/**
 * Get available brands (brands with at least one product in stock)
 * @route GET /api/brands/available
 */
const getAvailableBrands = async (req, res) => {
    try {
        const { category } = req.query;

        // Build match condition - only products that are in stock
        let matchCondition = {
            published: true,
            brand: { $exists: true, $ne: "" },
            $or: [
                { stockQuantity: { $gt: 0 } },
                { inStock: true }
            ]
        };

        // Apply category filter if provided
        if (category) {
            const categoryLower = category.toLowerCase();

            if (categoryLower === 'watches' || categoryLower === 'watch') {
                matchCondition.category = "Watch";
            } else if (categoryLower === 'bags' || categoryLower === 'handbags' || categoryLower === 'leather-bags') {
                // Ensure we don't overwrite the stock availability $or filter
                const bagCondition = {
                    $or: [
                        { category: "Leather Bags" },
                        { category: "Leather Goods", leatherMainCategory: "Bag" }
                    ]
                };

                // Combine conditions using $and to keep the stock filter
                const stockCondition = { $or: matchCondition.$or };
                delete matchCondition.$or;
                matchCondition.$and = [stockCondition, bagCondition];
            } else if (categoryLower === 'accessories') {
                matchCondition.category = "Accessories";
            } else {
                matchCondition.category = { $regex: new RegExp(`^${category}$`, 'i') };
            }
        }

        const brands = await Product.aggregate([
            { $match: matchCondition },
            {
                $project: {
                    cleanBrand: {
                        $trim: {
                            input: { $toLower: "$brand" }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$cleanBrand"
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Capitalize for frontend display
        const formattedBrands = brands.map((b) => ({
            name: b._id
                .split(" ")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")
        }));

        res.json({
            success: true,
            totalBrands: formattedBrands.length,
            brands: formattedBrands.map((b) => b.name),
            category: category || 'all',
            availableOnly: true
        });
    } catch (error) {
        console.error("❌ Error fetching available brands:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching available brands",
            error: process.env.NODE_ENV === "production" ? "Internal server error" : error.message
        });
    }
};

module.exports = {
    getAllBrands,
    getBrandDetails,
    getBrandsWithStats,
    getAvailableBrands
};
