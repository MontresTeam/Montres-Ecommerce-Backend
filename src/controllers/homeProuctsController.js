const HomeProducts = require("../models/homeProuctsGrid");
const Product = require("../models/product");

// Add new homeProducts
const addHomeProductsGrid = async (req, res) => {
  try {
    const { title, products } = req.body;

    // Check max 3 products
    if (products && products.length > 3) {
      return res.status(400).json({ message: "You can add up to 3 products only" });
    }

    // Check max 6 documents in the collection
    const count = await HomeProducts.countDocuments();
    if (count >= 6) {
      return res.status(400).json({ message: "You can only have up to 6 homeProductsGrid items" });
    }

    // Optional: Validate product IDs
    const validProducts = await Product.find({ _id: { $in: products } });
    if (validProducts.length !== products.length) {
      return res.status(400).json({ message: "One or more products are invalid" });
    }

    const newHomeProducts = new HomeProducts({ title, products });
    await newHomeProducts.save();

    res.status(201).json({ message: "HomeProductsGrid added successfully", HomeProducts: HomeProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// Update existing homeProducts
const updateHomeProducts = async (req, res) => { 
  try {
    const { id } = req.params;
    console.log(req.body)
    const { title, products } = req.body;

    if (products && products.length > 3) {
      return res.status(400).json({ message: "You can add up to 3 products only" });
    }

    if (products) {
      const validProducts = await Product.find({ _id: { $in: products } });
      if (validProducts.length !== products.length) {
        return res.status(400).json({ message: "One or more products are invalid" });
      }
    }

    const updatedHomeProducts = await HomeProducts.findByIdAndUpdate(
      id,
      { title, products },
      { new: true }
    );

    if (!updatedHomeProducts) {
      return res.status(404).json({ message: "HomeProducts not found" });
    }

    res.status(200).json({ message: "HomeProducts updated successfully", homeProducts: updatedHomeProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
const getHomeProductsGrid = async (req, res) => {
  try {
    // Fetch all documents and populate product details
    const homeProducts = await HomeProducts.find()
      .populate("products"); // assuming 'products' is an array of ObjectIds referencing Product

    res.status(200).json({ homeProducts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addHomeProductsGrid,
  updateHomeProducts,
  getHomeProductsGrid
};
