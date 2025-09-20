const Product = require("../models/product");
const SProduct = require('../models/ProductModal')
const WatchService = require('../models/repairserviceModal')

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

    // console.log(newProduct,"newProduct");
    

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 📌 Add Service Form (Create new booking)
const addServiceForm = async (req, res) => {
  try {
    const {
      productName,
      manufactureYear,
      watchType,
      selectedService,
      image, // optional (can be a URL or base64)
    } = req.body;

    // 🔹 Validate required fields
    if (!productName || !selectedService) {
      return res.status(400).json({
        success: false,
        message: "Product name and service type are required",
      });
    }

    
  

    // 🔹 Create new booking
    const newBooking = new WatchService({
      productName,
      manufactureYear,
      watchType,
      selectedService,
      image
    });

    await newBooking.save();

    res.status(201).json({
      success: true,
      message: "Service booked successfully",
      data: newBooking,
    });
  } catch (error) {
    console.log("❌ Error creating service booking:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


module.exports = {
  getProducts,
  addProduct,
  addServiceForm
};

