const Product = require("../models/product");
const SProduct = require("../models/ProductModal");

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

const productHome = async (req, res) => {
  try {
    // Fetch last-added products (LIFO order) using createdAt timestamp
    const brandNew = await Product.find()
      .sort({ createdAt: 1 })
      .skip(2) // newest first
      .limit(6)

    const newArrivals = await Product.find()
      .sort({ createdAt: -1 })  
      .skip(19)
      .limit(3);

    const montresTrusted = await Product.find()
      .sort({ createdAt: -1 })
      .skip(8)
      .limit(3);

    const lastBrandNew = await Product.find()
      .sort({ createdAt: -1 })
      .skip(12)
      .limit(6);

    res.json({
      brandNew,
      newArrivals,
      montresTrusted,
      lastBrandNew,
    });
  } catch (err) {
    res.status(500).json({
      message: "❌ Error fetching home products",
      error: err.message,
    });
  }
};

// Add Product

const addProduct = async (req, res) => {
  try {
    const images = req.files ? req.files.map((file) => file.path) : [];

    const newProduct = new SProduct({
      ...req.body,
      images,
    });

    console.log(newProduct, "newProduct");

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProducts,
  addProduct,
  productHome,
};
