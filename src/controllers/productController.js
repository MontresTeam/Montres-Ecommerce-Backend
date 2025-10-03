const Product = require("../models/product");
const SProduct = require("../models/ProductModal");
const WatchService = require("../models/repairserviceModal");

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
      .limit(6);

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

    // console.log(newProduct,"newProduct");

    console.log(newProduct, "newProduct");

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
      image,
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

const getRecommendations = async (cartItems, limit = 4) => {
  try {
    const cartProductIds = cartItems.map((item) => item.productId);

    if (cartProductIds.length === 0) {
      // Fallback: random watches
      return Product.aggregate([
        { $match: { categorisOne: "watch" } },
        { $sample: { size: limit } },
        { $project: { name: 1, images: 1, salePrice: 1, regularPrice: 1 } },
      ]);
    }

    // Fetch recommended products in one aggregation
    const recommended = await Product.aggregate([
      {
        $match: {
          _id: { $nin: cartProductIds }, // exclude cart items
          $or: [
            {
              categorisOne: {
                $in: cartItems.map((i) => i.categorisOne).filter(Boolean),
              },
            },
            {
              subcategory: {
                $in: cartItems.flatMap((i) => i.subcategory).filter(Boolean),
              },
            },
            {
              brands: {
                $in: cartItems.flatMap((i) => i.brands).filter(Boolean),
              },
            },
          ],
        },
      },
      { $sample: { size: limit } }, // random selection for variety
      { $project: { name: 1, images: 1, salePrice: 1, regularPrice: 1 } },
    ]);

    // If not enough recommendations, fallback to random watches
    if (!recommended || recommended.length === 0) {
      return Product.aggregate([
        { $match: { categorisOne: "watch" } },
        { $sample: { size: limit } },
        { $project: { name: 1, images: 1, salePrice: 1, regularPrice: 1 } },
      ]);
    }

    return recommended;
  } catch (err) {
    console.error("Recommendation Service Error:", err);
    throw new Error("Error fetching recommendations");
  }
};

const getAllProductwithSearch = async (req, res) => {
  try {
    const { search = "" } = req.query;

    // ✅ Case-insensitive search by name or brand
    let query = {};
    if (search.trim()) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } }, 
          { brand: { $regex: search, $options: "i" } }
        ],
      };
    }

    // ✅ Fetch all matching products
    const products = await Product.find(query);

    return res.json({
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.error("Product fetch error: ", error);
    res.status(500).json({
      message: "❌ Error fetching products",
      error: error.message,
    });
  }
};


module.exports = {
  getProducts,
  addProduct,
  addServiceForm,
  productHome,
  getRecommendations,
  getAllProductwithSearch,
};
