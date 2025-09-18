const Product = require("../models/product");

const getProducts = async (req, res) => {
  try {
    const { id, page = 1, limit = 15 } = req.query; // ✅ default page=1, limit=12

    if (id) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "❌ Product not found" });
      }
      return res.json(product);
    }

    // ✅ Convert to numbers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // ✅ Count total products
    const totalProducts = await Product.countDocuments();

    // ✅ Fetch paginated products
    const products = await Product.find()
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
      message: "❌ Error fetching products",
      error: err.message,
    });
  }
};

module.exports = {
  getProducts,
};
