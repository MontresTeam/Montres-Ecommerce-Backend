const Product = require("../models/product");

const getProducts = async (req, res) => {
  try {
    const { id } = req.query; // ✅ use query instead of body/params

    if (id) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "❌ Product not found" });
      }
      return res.json(product);
    }

    // If no id -> fetch all
    const products = await Product.find();
    return res.json(products);

  } catch (err) {
    res.status(500).json({ message: "❌ Error fetching products", error: err.message });
  }
};

module.exports = {
  getProducts,
};

