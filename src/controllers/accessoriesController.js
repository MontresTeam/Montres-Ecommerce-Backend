const Product = require("../models/product");
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

module.exports = { getAccessoriesProducts };
