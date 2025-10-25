// import mongoose from "mongoose";
const mongoose = require("mongoose");
const {
  ALL_FUNCTIONS,
  SCOPE_OF_DELIVERY_OPTIONS,
  WATCH_TYPES,
  GENDERS,
  MOVEMENTS,
  COLORS,
  MATERIALS,
  STRAP_MATERIALS,
  CRYSTALS,
  BEZEL_MATERIALS,
  CONDITIONS,
  REPLACEMENT_PARTS,
  DIALNUMERALS
} = require("../utils/productConstants");
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

// ✅ Updated Product Schema with SKU that can be manually set
const productSchema = new mongoose.Schema(
  {
    // ────────────── BASIC INFORMATION ──────────────
    brand: { type: String, required: true },
    model: { type: String, required: true },
    sku: { type: String },
    referenceNumber: { type: String },
    serialNumber: { type: String },
    additionalTitle: { type: String },
    watchType: { type: String, enum: WATCH_TYPES },
    scopeOfDelivery: { type: String, enum: SCOPE_OF_DELIVERY_OPTIONS },
    includedAccessories: { type: String },
    category: {
    type: String,
    enum: ["Watch", "Jewellery", "Gold", "Accessories", "Home Accessories","Personal Accessories","Pens"],
    required: true
  },

    // ────────────── ITEM FEATURES ──────────────
    productionYear: { type: String },
    approximateYear: { type: Boolean, default: false },
    unknownYear: { type: Boolean, default: false },
    gender: { type: String, enum: GENDERS, default: "Men/Unisex" },
    movement: { type: String, enum: MOVEMENTS },
    dialColor: { type: String, enum: COLORS },
    caseMaterial: { type: String, enum: MATERIALS },
    strapMaterial: { type: String, enum: STRAP_MATERIALS },

    // ────────────── ADDITIONAL INFORMATION ──────────────
    strapColor: { type: String, enum: COLORS },
    strapSize: { type: Number }, // mm
    caseSize: { type: Number }, // mm
    caseColor: { type: String, enum: COLORS },
    crystal: { type: String, enum: CRYSTALS },
    bezelMaterial: { type: String, enum: BEZEL_MATERIALS },
    dialNumerals: { type: String,enum:DIALNUMERALS },
    caliber: { type: String },
    powerReserve: { type: Number }, // hours
    jewels: { type: Number },
    functions: [{ type: String, enum: ALL_FUNCTIONS }],
    condition: { type: String, enum: CONDITIONS },
    replacementParts: [{ type: String, enum: REPLACEMENT_PARTS }],

    // ────────────── PRICING & INVENTORY ──────────────
    regularPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    taxStatus: {
      type: String,
      enum: ["taxable", "shipping", "none"],
      default: "taxable",
    },
    stockQuantity: { type: Number, default: 0 },

    // ────────────── DESCRIPTION & META ──────────────
    description: { type: String },
    visibility: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
    },

    // ────────────── SEO FIELDS ──────────────
    seoTitle: { type: String },
    seoDescription: { type: String },
    seoKeywords: [{ type: String }],

    // ────────────── CORE PRODUCT INFO (Legacy fields - keep for compatibility) ──────────────
    name: { type: String }, // Now optional, can be generated from brand + model
    published: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    inStock: { type: Boolean, default: true },

    // ────────────── MEDIA ──────────────
    images: [imageSchema],

    // ────────────── META & ATTRIBUTES ──────────────
    meta: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attributes: [attributeSchema],

    // ────────────── TRACKING ──────────────
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "products",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
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
