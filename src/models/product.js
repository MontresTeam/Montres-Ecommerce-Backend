// import mongoose from "mongoose";
const mongoose = require("mongoose");
const attributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    values: [{ type: String }], // multiple values possible
    visible: { type: Boolean, default: false },
    global: { type: Boolean, default: false },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String },
    alt: { type: String },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // Core WooCommerce Fields
    productId: { type: Number, index: true }, // WooCommerce ID
    type: { type: String }, // simple, variable, grouped, etc.
    sku: { type: String, unique: false },
    gtin: { type: String }, // UPC, EAN, ISBN
    name: { type: String, required: true },
    published: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    visibility: { type: String }, // visible, hidden, catalog, etc.
    shortDescription: { type: String },
    description: { type: String },
    salePrice: { type: Number },
    regularPrice: { type: Number },
    dateSaleStart: { type: Date },
    dateSaleEnd: { type: Date },
    taxStatus: { type: String }, // taxable, shipping, none
    taxClass: { type: String },
    inStock: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 0 },
    lowStockAmount: { type: Number },
    backordersAllowed: { type: Boolean, default: false },
    soldIndividually: { type: Boolean, default: false },
    categorisOne: {type:String},
    subcategory: [{ type: String }],
    gender: {type:String ,enum:['men','women','unisex']},
    // Shipping
    weight: { type: Number },
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    shippingClass: { type: String },

    // Review & Notes
    allowReviews: { type: Boolean, default: true },
    purchaseNote: { type: String },

    // Categories & Tags
    categories: [{ type: String }],
    tags: [{ type: String }],
    brands: [{ type: String }],

    // Media
    images: [imageSchema],

    // Linked Products
    parent: { type: Number },
    groupedProducts: [{ type: Number }],
    upsells: [{ type: Number }],
    crossSells: [{ type: Number }],

    // External / Affiliate
    externalUrl: { type: String },
    buttonText: { type: String },

    // Inventory / Cost
    costOfGoods: { type: Number },

    // Custom Meta (WooCommerce plugins, themes, Elementor, Woodmart, etc.)
    meta: {
      type: Map,
      of: mongoose.Schema.Types.Mixed, // store any meta key:value pairs
    },

    // Attributes
    attributes: [attributeSchema],

    // WooCommerce extra
    position: { type: Number },
    downloadLimit: { type: Number },
    downloadExpiry: { type: Number },

    // Tracking
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true ,collection: "products"  }
  
);

// 🔥 CRITICAL INDEXES FOR PERFORMANCE 🔥

// Single Field Indexes
productSchema.index({ published: 1 }); // For filtering published products
productSchema.index({ featured: 1 }); // For featured products
productSchema.index({ inStock: 1 }); // For stock availability
productSchema.index({ type: 1 }); // For product type filtering
productSchema.index({ gender: 1 }); // For gender-based filtering
productSchema.index({ categorisOne: 1 }); // For main category filtering
productSchema.index({ createdAt: -1 }); // For newest products
productSchema.index({ updatedAt: -1 }); // For recently updated products

// Array Field Indexes (for categories, brands, subcategory arrays)
productSchema.index({ categories: 1 }); // For category filtering
productSchema.index({ subcategory: 1 }); // For subcategory filtering
productSchema.index({ brands: 1 }); // For brand filtering
productSchema.index({ tags: 1 }); // For tag filtering

// Price-related Indexes
productSchema.index({ salePrice: 1 }); // For price low to high sorting
productSchema.index({ regularPrice: 1 }); // For regular price filtering
productSchema.index({ salePrice: -1 }); // For price high to low sorting

// Date-based Indexes for sales
productSchema.index({ dateSaleStart: 1, dateSaleEnd: 1 }); // For active sales queries

// 🔥 COMPOUND INDEXES FOR COMMON QUERY PATTERNS 🔥

// Main product listing queries
productSchema.index({ 
  published: 1, 
  inStock: 1, 
  categories: 1, 
  createdAt: -1 
});

// Category + Brand filtering
productSchema.index({ 
  categories: 1, 
  brands: 1, 
  published: 1 
});

// Search and filter combinations
productSchema.index({ 
  name: 'text', 
  categories: 1, 
  published: 1 
});

// Price range filtering within categories
productSchema.index({ 
  categories: 1, 
  salePrice: 1, 
  published: 1 
});

// Gender + Category combinations
productSchema.index({ 
  gender: 1, 
  categories: 1, 
  published: 1 
});

// Featured products with categories
productSchema.index({ 
  featured: 1, 
  categories: 1, 
  published: 1 
});

// Stock + Category combinations
productSchema.index({ 
  inStock: 1, 
  categories: 1, 
  published: 1 
});

// 🔥 TEXT INDEX FOR SEARCH FUNCTIONALITY 🔥
productSchema.index({
  name: 'text',
  shortDescription: 'text',
  description: 'text',
  sku: 'text',
  tags: 'text'
}, {
  name: 'product_search_index',
  weights: {
    name: 10,
    sku: 8,
    tags: 5,
    shortDescription: 3,
    description: 1
  }
});


module.exports = mongoose.model("Product", productSchema, "products");
