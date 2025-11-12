const Product = require("../models/product");
const SProduct = require("../models/ProductModal");
const RestockSubscription = require('../models/RestockSubscription')
const WatchService = require("../models/repairserviceModal");
const getProducts = async (req, res) => {
  try {
    const {
      id,
      page = 1,
      limit = 15,
      category,
      brand,
      price,
      availability,
      gender,
      search,
    } = req.query;

    // ✅ Single Product by ID
    if (id) {
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "❌ Product not found" });
      }
      return res.json(product);
    }

    // ✅ Convert pagination params
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));

    // ✅ Base Filter
    const filterQuery = { published: true };
    const andConditions = [];

    // 🔹 Helper to normalize comma-separated or array inputs
    const normalizeArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    };

    // ✅ Category Filter (categoryOne)
    const categoryList = normalizeArray(category);
    console.log(categoryList, "vs");
    if (categoryList.length > 0) {
      andConditions.push({
        $or: categoryList.map((cat) => ({
          categorisOne: { $regex: `^${cat}$`, $options: "i" },
        })),
      });
    }

    // ✅ Brand Filter (meta.Brands)
    const brandList = normalizeArray(brand);
    if (brandList.length > 0) {
      andConditions.push({
        "meta.Brands": { $in: brandList.map((br) => new RegExp(br, "i")) },
      });
    }

    // ✅ Price Filter
    const priceList = normalizeArray(price);
    if (priceList.length > 0) {
      const priceConditions = [];
      priceList.forEach((range) => {
        const [min, max] = range.split("-").map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          priceConditions.push({ salePrice: { $gte: min, $lte: max } });
        } else if (!isNaN(min)) {
          priceConditions.push({ salePrice: { $gte: min } });
        }
      });
      if (priceConditions.length > 0) {
        andConditions.push({ $or: priceConditions });
      }
    }

    // ✅ Availability Filter
    const availList = normalizeArray(availability);
    const availConditions = [];
    availList.forEach((avail) => {
      if (avail === "in_stock") {
        andConditions.push({ inStock: true });
      } else if (avail === "out_of_stock") {
        availConditions.push({ stockQuantity: { $lte: 0 } });
      }
    });
    if (availConditions.length > 0) {
      andConditions.push({ $or: availConditions });
    }

    // ✅ Gender Filter
    const genderList = normalizeArray(gender);
    if (genderList.length > 0) {
      andConditions.push({ gender: { $in: genderList } });
    }

    // ✅ Search Filter
    if (search && search.trim()) {
      andConditions.push({ name: new RegExp(search.trim(), "i") });
    }

    // ✅ Merge all AND filters
    if (andConditions.length > 0) {
      filterQuery.$and = andConditions;
    }

    // ✅ Sort by recent
    const sortObj = { createdAt: -1 };

    // ✅ Count total
    const totalProducts = await Product.countDocuments(filterQuery);

    if (totalProducts === 0) {
      return res.json({
        totalProducts: 0,
        totalPages: 0,
        currentPage: pageNum,
        products: [],
        message: "No products found",
      });
    }

    // ✅ Query only essential fields
    const products = await Product.find(filterQuery)
      .select(
        "brand model name sku referenceNumber serialNumber watchType watchStyle scopeOfDelivery " +
        "productionYear gender movement dialColor caseMaterial strapMaterial strapColor dialNumerals " +
        "salePrice regularPrice stockQuantity taxStatus strapSize caseSize includedAccessories " +
        "condition itemCondition category description visibility published featured inStock " +
        "Badges images createdAt updatedAt"
      )
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(totalProducts / limitNum);

    // ✅ Format response
    const formattedProducts = products.map((p) => ({
      ...p,
      brand: p.brand || "", // ✅ Use the direct brand field
      category: p.category || "", // ✅ corrected from `categorisOne`
      image: p.images?.[0]?.url || "",
      available: p.stockQuantity > 0,
      discount:
        p.regularPrice && p.salePrice
          ? Math.round(((p.regularPrice - p.salePrice) / p.regularPrice) * 100)
          : 0,
    }));

    res.json({
      totalProducts,
      totalPages,
      currentPage: pageNum,
      products: formattedProducts,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
    });
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({
      message: "❌ Error fetching products",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
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
    const productData = req.body;

    if (!productData.name) {
      return res.status(400).json({ message: "Product name is required." });
    }

    // Parse stringified JSON fields
    const parseJSON = (field) => {
      if (!field) return undefined;
      try {
        return typeof field === "string" ? JSON.parse(field) : field;
      } catch {
        return field;
      }
    };

    const newProduct = new Product({
      ...productData,
      subcategory: parseJSON(productData.subcategory),
      brands: parseJSON(productData.brands),
      tags: parseJSON(productData.tags),
      attributes: parseJSON(productData.attributes),
      images: req.body.images || [], // already array from upload middleware
    });

    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("Add product error:", error);
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

// Subscribe to restock notifications

const restockSubscribe = async (req,res)=>{
  const { productId, email } = req.body;

  if (!productId || !email) {
    return res.status(400).json({ success: false, message: "Product and email are required" });
  }

  try {
    // Check if already subscribed
    const existing = await RestockSubscription.findOne({ productId, email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Already subscribed" });
    }

    const subscription = new RestockSubscription({ productId, email });
    await subscription.save();

    res.json({ success: true, message: "Subscribed for restock notification!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}




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
          { brand: { $regex: search, $options: "i" } },
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

const SimilarProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const similarProducts = await Product.find({
      _id: { $ne: product._id },
      brand: product.brand,
      category: product.category,
      watchType: product.watchType,
      gender: product.gender,
      movement: product.movement,
      condition: product.condition,
    }).limit(10);

    res.status(200).json({
      success: true,
      products: similarProducts,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const YouMayAlsoLike = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const suggestions = await Product.find({
      _id: { $ne: product._id },
      category: product.category,     // broad match
      $or: [
        { featured: true },           // trending
        { discount: { $gte: 5 } },    // offers
        { brand: { $ne: product.brand } }, // DIFFERENT brand
      ],
    })
      .sort({ createdAt: -1 })
      .limit(12);

    res.status(200).json({
      success: true,
      products: suggestions,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  getProducts,
  addProduct,
  addServiceForm,
  productHome,
  getRecommendations,
  getAllProductwithSearch,
  restockSubscribe,
  SimilarProduct,
  YouMayAlsoLike
};
