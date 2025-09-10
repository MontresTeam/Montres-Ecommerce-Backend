const Product = require("../models/product");

const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    return res.json(products);
  } catch (err) {
    res.status(500).json({ message: "❌ Error fetching products", error: err });
  }
};

module.exports = {
  getProducts,
};
