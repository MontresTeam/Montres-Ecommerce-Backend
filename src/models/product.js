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
    url: { type: String, required: true },
    alt: { type: String },
    type: { type: String, enum: ["main", "cover"], default: "cover" }, // ✅ main or cover
  },
  { _id: false }
);

// ✅ Product Schema
const productSchema = new mongoose.Schema(
  {
    // ────────────── CORE PRODUCT INFO ──────────────
    productId: { type: Number, index: true }, // WooCommerce or external ID
    type: { type: String, default: "simple" }, // simple, variable, grouped
    sku: { type: String, unique: false },
    RefenceNumber: { type: String, unique: false },
    serialNumber: { type: String },
    gtin: { type: String }, // UPC / EAN / ISBN
    name: { type: String, required: true },
    description: { type: String },
    salePrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 }, // ✅ New discount field
    regularPrice: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    visibility: { type: String, default: "visible" },
    inStock: { type: Boolean, default: true },
    stockQuantity: { type: Number, default: 0 },

    // ────────────── TAX FIELDS ──────────────
    taxStatus: {
      type: String,
      enum: ["taxable", "shipping", "none"],
      default: "taxable",
    },
    taxClass: { type: String },

    // ────────────── CATEGORY & CLASSIFICATION ──────────────
    categories: {
      type: String,
      enum: ["Luxury", "Classic watch", "Sports watch", "Vintage watch"],
      required: true,
    },
    subcategory: {
      type: String,
      enum: [
        "Quartz",
        "Automatic",
        "Chronograph",
        "Dress watch",
        "Limited edition",
        "Pilot watch",
        "Diver’s watch",
        "Swiss made",
        "Moonphase",
      ],
    },
    // ✅ Added Collection field
    collection: {
      type: String,
      enum: [
        "Classic Collection",
        "Limited Collection",
        "Heritage Collection",
        "Prestige Collection",
        "Signature Collection",
        "None",
      ],
      default: "None",
    },

    // ────────────── WATCH SPECIFICATIONS ──────────────
    CaseDiameter: { type: Number }, // mm
    Movement: {
      type: String,
      enum: ["automatic", "quartz", "manual", "solar", "kinetic"],
    },
    Dial: { type: String },
    WristSize: { type: Number }, // cm
    Condition: {
      type: String,
      enum: ["new", "like-new", "excellent", "very-good", "good", "fair"],
    },
    Accessories: { type: String },
    ProductionYear: { type: String },

    // ────────────── GENDER ──────────────
    gender: {
      type: String,
      enum: ["men/unisex", "women"], // ✅ exactly what you want
      default: "men/unisex", // ✅ must be one of the enum values
    },

    // ────────────── SHIPPING & DIMENSIONS ──────────────
    weight: { type: Number },
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    shippingClass: { type: String },

    // ────────────── TAGS & BRANDS ──────────────
    tags: [{ type: String }],
    brands: [{ type: String }],

    // ────────────── MEDIA ──────────────
    images: [imageSchema],

    // ────────────── META & ATTRIBUTES ──────────────
    meta: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attributes: [attributeSchema],

    // ────────────── ADDITIONAL INFO ──────────────
    allowReviews: { type: Boolean, default: true },
    purchaseNote: { type: String },
    externalUrl: { type: String },
    buttonText: { type: String },
    costOfGoods: { type: Number },

    // ────────────── RELATIONAL FIELDS ──────────────
    parent: { type: Number },
    groupedProducts: [{ type: Number }],
    upsells: [{ type: Number }],
    crossSells: [{ type: Number }],

    // ────────────── TRACKING ──────────────
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "products" }
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
  createdAt: -1,
});

// Category + Brand filtering
productSchema.index({
  categories: 1,
  brands: 1,
  published: 1,
});

// Search and filter combinations
productSchema.index({
  name: "text",
  categories: 1,
  published: 1,
});

// Price range filtering within categories
productSchema.index({
  categories: 1,
  salePrice: 1,
  published: 1,
});

// Gender + Category combinations
productSchema.index({
  gender: 1,
  categories: 1,
  published: 1,
});

// Featured products with categories
productSchema.index({
  featured: 1,
  categories: 1,
  published: 1,
});

// Stock + Category combinations
productSchema.index({
  inStock: 1,
  categories: 1,
  published: 1,
});

// 🔥 TEXT INDEX FOR SEARCH FUNCTIONALITY 🔥
productSchema.index(
  {
    name: "text",
    shortDescription: "text",
    description: "text",
    sku: "text",
    tags: "text",
  },
  {
    name: "product_search_index",
    weights: {
      name: 10,
      sku: 8,
      tags: 5,
      shortDescription: 3,
      description: 1,
    },
  }
);

module.exports = mongoose.model("Product", productSchema, "products");
