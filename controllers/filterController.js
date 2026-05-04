const Product = require("../models/product");
const { buildProductQuery } = require("../utils/queryHelper");
const { escapeRegExp } = require("../utils/securityUtils");

const filerDatareferenceNumber = async (req, res) => {
  try {
    const data = await Product.aggregate([
      {
        $match: {
          referenceNumber: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$referenceNumber",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          value: "$_id",
          count: 1,
        },
      },
      {
        $sort: { value: 1 },
      },
    ]);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getWatchFilters = async (req, res) => {
  try {
    const { search, gender } = req.query;

    let query = {
      category: "Watch",
      published: true,
    };

    if (search && search.trim()) {
      const escapedSearch = escapeRegExp(search.trim());
      const searchRegex = new RegExp(escapedSearch, "i");
      query.$and = [
        {
          $or: [
            { name: searchRegex },
            { brand: searchRegex },
            { model: searchRegex },
            { description: searchRegex },
            { referenceNumber: searchRegex },
          ],
        },
      ];
    }

    if (gender) {
      query.gender = { $regex: new RegExp(escapeRegExp(gender), "i") };
    }

    console.log("[Filter Debug] getWatchFilters query:", JSON.stringify(query, null, 2));

    const [
      watchTypes,
      watchStyles,
      brands,
      models,
      movements,
      caseMaterials,
      caseColors,
      dialColors,
      strapColors,
      caseSizes,
      referenceNumbers,
    ] = await Promise.all([
      Product.distinct("watchType", query),
      Product.distinct("watchStyle", query),
      Product.distinct("brand", query),
      Product.distinct("model", query),
      Product.distinct("movement", query),
      Product.distinct("caseMaterial", query),
      Product.distinct("caseColor", query),
      Product.distinct("dialColor", query),
      Product.distinct("strapColor", query),
      Product.distinct("caseSize", query),
      Product.distinct("referenceNumber", query),
    ]);

    const data = {
      watchTypes: watchTypes.filter(Boolean).sort(),
      watchStyles: watchStyles.filter(Boolean).sort(),
      brands: brands.filter(Boolean).sort(),
      models: models.filter(Boolean).sort(),
      movements: movements.filter(Boolean).sort(),
      caseMaterials: caseMaterials.filter(Boolean).sort(),
      caseColors: caseColors.filter(Boolean).sort(),
      dialColors: dialColors.filter(Boolean).sort(),
      strapColors: strapColors.filter(Boolean).sort(),
      caseSizes: caseSizes.filter((v) => v !== null && v !== undefined).sort(),
      referenceNumbers: referenceNumbers.filter(Boolean).sort(),
    };

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Filter Debug] getWatchFilters error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getBrandFilters = async (req, res) => {
  try {
    const { category } = req.query;
    let query = { published: true };
    if (category) query.category = category;

    const brands = await Product.distinct("brand", query);

    res.status(200).json({
      success: true,
      data: brands.filter(Boolean).sort(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getFacetedFilters = async (req, res) => {
  try {
    const query = buildProductQuery(req.query);

    const facets = await Product.aggregate([
      { $match: query },
      {
        $facet: {
          brands: [
            { $group: { _id: "$brand", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1, _id: 1 } }
          ],
          models: [
            { $group: { _id: "$model", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1, _id: 1 } }
          ],
          watchTypes: [
            { $group: { _id: "$watchType", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1, _id: 1 } }
          ],
          watchStyles: [
            { $group: { _id: "$watchStyle", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } },
            { $sort: { count: -1, _id: 1 } }
          ],
          movements: [
            { $group: { _id: "$movement", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          caseMaterials: [
            { $group: { _id: "$caseMaterial", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          dialColors: [
            { $group: { _id: "$dialColor", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          strapMaterials: [
            { $group: { _id: "$strapMaterial", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          conditions: [
            { $group: { _id: "$condition", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          subCategories: [
            {
              $project: {
                combinedSub: {
                  $concatArrays: [
                    { $ifNull: ["$subcategory", []] },
                    { $cond: { if: { $gt: ["$leatherSubCategory", null] }, then: ["$leatherSubCategory"], else: [] } },
                    { $cond: { if: { $gt: ["$accessorySubCategory", null] }, then: ["$accessorySubCategory"], else: [] } }
                  ]
                }
              }
            },
            { $unwind: "$combinedSub" },
            { $group: { _id: "$combinedSub", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          colors: [
            {
              $project: {
                combinedColor: {
                  $concatArrays: [
                    { $cond: { if: { $gt: ["$color", null] }, then: ["$color"], else: [] } },
                    { $cond: { if: { $gt: ["$dialColor", null] }, then: ["$dialColor"], else: [] } },
                    { $ifNull: ["$accessoryColor", []] }
                  ]
                }
              }
            },
            { $unwind: "$combinedColor" },
            { $group: { _id: "$combinedColor", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          materials: [
            {
              $project: {
                combinedMat: {
                  $concatArrays: [
                    { $cond: { if: { $gt: ["$caseMaterial", null] }, then: ["$caseMaterial"], else: [] } },
                    { $cond: { if: { $gt: ["$leatherMaterial", null] }, then: ["$leatherMaterial"], else: [] } },
                    { $ifNull: ["$accessoryMaterial", []] }
                  ]
                }
              }
            },
            { $unwind: "$combinedMat" },
            { $group: { _id: "$combinedMat", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          genders: [
            { $group: { _id: "$gender", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ],
          availabilities: [
            {
              $project: {
                status: {
                  $cond: {
                    if: { $or: [{ $gt: ["$stockQuantity", 0] }, { $eq: ["$inStock", true] }] },
                    then: "In Stock",
                    else: "Sold Out"
                  }
                }
              }
            },
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          leatherMainCategories: [
            { $group: { _id: "$leatherMainCategory", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null, $ne: "" } } }
          ]
        }
      }
    ]);

    const result = facets[0];
    const formatFacet = (facetData) => (facetData || []).map(item => ({ label: item._id, value: item._id, count: item.count }));

    res.status(200).json({
      success: true,
      data: {
        brands: formatFacet(result.brands),
        models: formatFacet(result.models),
        watchTypes: formatFacet(result.watchTypes),
        watchStyles: formatFacet(result.watchStyles),
        movements: formatFacet(result.movements),
        caseMaterials: formatFacet(result.caseMaterials),
        dialColors: formatFacet(result.dialColors),
        strapMaterials: formatFacet(result.strapMaterials),
        conditions: formatFacet(result.conditions),
        subCategories: formatFacet(result.subCategories),
        colors: formatFacet(result.colors),
        materials: formatFacet(result.materials),
        genders: formatFacet(result.genders),
        availabilities: formatFacet(result.availabilities),
        leatherMainCategories: formatFacet(result.leatherMainCategories),
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { filerDatareferenceNumber, getWatchFilters, getBrandFilters, getFacetedFilters };
