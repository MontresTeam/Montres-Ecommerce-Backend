const Product = require("../models/product");
const SProduct = require('../models/ProductModal')

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



// Add Product

const addProduct = async (req, res) => {
  try {
  
    const images = req.files ? req.files.map(file => file.path) : [];

    const newProduct = new SProduct({
      ...req.body,
      images, 
    });

    console.log(newProduct,"newProduct");
    

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  getProducts,
  addProduct
};

