// controllers/recommendController.js
const Product = require('../models/product');
const UserActivity = require('../models/UserActivity');

/**
 * Utility: merge and dedupe product arrays and preserve order
 */
function mergeUnique(arrays, limit = 12) {
  const seen = new Set();
  const out = [];
  for (const arr of arrays) {
    if (!arr) continue;
    for (const p of arr) {
      const id = (p._id || p.id).toString();
      if (!seen.has(id)) {
        seen.add(id);
        out.push(p);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/**
 * Main hybrid recommendation algorithm
 */
exports.getJustForYou = async (req, res) => {
  try {
    const userId = req.params.userId || null;

    // If USER NOT LOGGED IN -> return TRENDING products
    if (!userId) {
      const trending = await Product.find({
        $or: [{ stockQuantity: { $gt: 0 } }, { inStock: true }],
      })
        .sort({ sold: -1, rating: -1 })
        .limit(12)
        .lean();
      return res.json(trending);
    }

    const activity = await UserActivity.findOne({ userId }).lean();

    // If user has no activity -> fallback to trending
    if (!activity) {
      const trending = await Product.find({
        $or: [{ stockQuantity: { $gt: 0 } }, { inStock: true }],
      })
        .sort({ sold: -1, rating: -1 })
        .limit(12)
        .lean();
      return res.json(trending);
    }

    const results = [];

    // 1) Last viewed category
    if (activity.lastViewedCategory) {
      const catProducts = await Product.find({
        category: activity.lastViewedCategory,
        $or: [{ stockQuantity: { $gt: 0 } }, { inStock: true }],
      })
        .sort({ sold: -1, rating: -1 })
        .limit(12)
        .lean();
      results.push(catProducts);
    }

    // 2) Wishlist-based
    if (activity.wishlist && activity.wishlist.length) {
      const wishlistProducts = await Product.find({
        _id: { $in: activity.wishlist },
      }).lean();

      const wishlistBrands = [
        ...new Set(wishlistProducts.map((p) => p.brand).filter(Boolean)),
      ];
      const wishlistCats = [
        ...new Set(wishlistProducts.map((p) => p.category).filter(Boolean)),
      ];

      if (wishlistBrands.length) {
        const byBrand = await Product.find({
          brand: { $in: wishlistBrands },
          $or: [{ stockQuantity: { $gt: 0 } }, { inStock: true }],
        })
          .sort({ sold: -1, rating: -1 })
          .limit(8)
          .lean();
        results.push(byBrand);
      }

      if (wishlistCats.length) {
        const byCat = await Product.find({
          category: { $in: wishlistCats },
          $or: [{ stockQuantity: { $gt: 0 } }, { inStock: true }],
        })
          .sort({ sold: -1, rating: -1 })
          .limit(8)
          .lean();
        results.push(byCat);
      }
    }

    // 3) Similar price range
    let avgPrice = activity.averagePriceSeen || 0;

    if (!avgPrice && activity.viewedProducts?.length) {
      const lastViewedProduct = await Product.findById(
        activity.viewedProducts.slice(-1)[0]
      ).lean();
      if (lastViewedProduct) avgPrice = lastViewedProduct.regularPrice || 0;
    }

    if (avgPrice && avgPrice > 0) {
      const delta = Math.max(avgPrice * 0.2, 100);

      const priceRange = await Product.find({
        regularPrice: { $gte: avgPrice - delta, $lte: avgPrice + delta },
        $or: [{ stockQuantity: { $gt: 0 } }, { inStock: true }],
      })
        .sort({ sold: -1 })
        .limit(12)
        .lean();

      results.push(priceRange);
    }

    // 4) Trending Fallback
    const trending = await Product.find({
      $or: [{ stockQuantity: { $gt: 0 } }, { inStock: true }],
    })
      .sort({ sold: -1, rating: -1 })
      .limit(12)
      .lean();
    results.push(trending);

    // Merge all results uniquely
    const merged = mergeUnique(results, 12);

    return res.json(merged);
  } catch (err) {
    console.error("Recommendation Error:", err);
    return res.status(500).json({ message: "Server error generating recommendations" });
  }
};
