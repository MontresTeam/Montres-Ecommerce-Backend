const mongoose = require("mongoose");
const {
  ALL_FUNCTIONS,
  SCOPE_OF_DELIVERY_OPTIONS,
  WATCH_TYPES,
  WATCHSTYLE_CATEGORY,
  GENDERS,
  MOVEMENTS,
  COLORS,
  MATERIALS,
  STRAP_MATERIALS,
  CRYSTALS,
  BEZEL_MATERIALS,
  CONDITIONS,
  ITEM_CONDITIONS,
  INCLUDE_ACCESSORIES,
  REPLACEMENT_PARTS,
  DIALNUMERALS,
} = require("../utils/productConstants");

const attributeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    values: [{ type: String }],
    visible: { type: Boolean, default: false },
    global: { type: Boolean, default: false },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String },
    type: { type: String, enum: ["main", "cover"], default: "cover" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    // ────────────── BASIC INFORMATION ──────────────
    brand: { type: String, required: true },
    model: { type: String, required: true },
    sku: { type: String },
    referenceNumber: { type: String },
    serialNumber: { type: String },
    additionalTitle: { type: String },
    watchType: {
      type: String,
      enum: WATCH_TYPES,
      required: true,
    },
    watchStyle: {
      type: String,
      enum: WATCHSTYLE_CATEGORY,
    },
    scopeOfDelivery: [{
      type: String,
      enum: SCOPE_OF_DELIVERY_OPTIONS,
    }],
    includedAccessories: [{
      type: String,
      enum: INCLUDE_ACCESSORIES,
    }],
    category: {
      type: String,
      enum: [
        "Watch",
        "Jewellery",
        "Gold",
        "Accessories",
        "Leather Goods",
        "Leather Bags",
      ],
      required: true,
    },

    // ────────────── CONDITION INFORMATION ──────────────
    condition: {
      type: String,
      enum: CONDITIONS,
    },
    itemCondition: {
      type: String,
      enum: ITEM_CONDITIONS,
    },

    // ────────────── ITEM FEATURES ──────────────
    productionYear: { type: String },
    approximateYear: { type: Boolean, default: false },
    unknownYear: { type: Boolean, default: false },

    gender: {
      type: String,
      enum: GENDERS,
      default: "Men/Unisex",
    },
    movement: {
      type: String,
      enum: MOVEMENTS,
    },
    dialColor: {
      type: String,
      enum: COLORS,
    },
    caseMaterial: {
      type: String,
      enum: MATERIALS,
    },
    strapMaterial: {
      type: String,
      enum: STRAP_MATERIALS,
    },

    // ────────────── ADDITIONAL INFORMATION ──────────────
    strapColor: {
      type: String,
      enum: COLORS,
    },
    strapSize: { type: Number },
    caseSize: { type: Number },
    caseColor: {
      type: String,
      enum: COLORS,
    },
    crystal: {
      type: String,
      enum: CRYSTALS,
    },
    bezelMaterial: {
      type: String,
      enum: BEZEL_MATERIALS,
    },
    dialNumerals: {
      type: String,
      enum: DIALNUMERALS,
    },
    caliber: { type: String },
    powerReserve: { type: Number },
    jewels: { type: Number },
    functions: [{
      type: String,
      enum: ALL_FUNCTIONS,
    }],
    replacementParts: [{
      type: String,
      enum: REPLACEMENT_PARTS,
    }],

    // ────────────── PRICING & INVENTORY ──────────────
    regularPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    taxStatus: {
      type: String,
      enum: ["taxable", "shipping", "none"],
      default: "taxable",
    },
    stockQuantity: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },

    // ───────── TAGS / BADGES ─────────
    badges: {
      type: [String],
      enum: ["Popular", "New Arrivals"],
      default: [],
    },

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

    // ────────────── CORE PRODUCT INFO ──────────────
    name: { type: String },
    published: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },

    // ────────────── MEDIA ──────────────
    images: [imageSchema],

    // ────────────── META & ATTRIBUTES ──────────────
    meta: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    attributes: [attributeSchema],
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
productSchema.index({ published: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ inStock: 1 });
productSchema.index({ watchType: 1 });
productSchema.index({ watchStyle: 1 }); // New index for watchStyle
productSchema.index({ gender: 1 });
productSchema.index({ category: 1 });
productSchema.index({ condition: 1 });
productSchema.index({ itemCondition: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ updatedAt: -1 });

// Array Field Indexes
productSchema.index({ includedAccessories: 1 });
productSchema.index({ functions: 1 });
productSchema.index({ replacementParts: 1 });
productSchema.index({ seoKeywords: 1 });

// Price-related Indexes
productSchema.index({ salePrice: 1 });
productSchema.index({ regularPrice: 1 });
productSchema.index({ salePrice: -1 });

// 🔥 COMPOUND INDEXES FOR COMMON QUERY PATTERNS 🔥

// Main product listing queries
productSchema.index({
  published: 1,
  inStock: 1,
  category: 1,
  createdAt: -1,
});

// Category + Brand filtering
productSchema.index({
  category: 1,
  brand: 1,
  published: 1,
});

// Watch Style filtering
productSchema.index({
  watchStyle: 1,
  category: 1,
  published: 1,
});

// Search and filter combinations
productSchema.index({
  name: "text",
  category: 1,
  published: 1,
});

// Price range filtering within categories
productSchema.index({
  category: 1,
  salePrice: 1,
  published: 1,
});

// Gender + Category combinations
productSchema.index({
  gender: 1,
  category: 1,
  published: 1,
});

// Watch Type + Style combinations
productSchema.index({
  watchType: 1,
  watchStyle: 1,
  published: 1,
});

// Featured products with categories
productSchema.index({
  featured: 1,
  category: 1,
  published: 1,
});

// Stock + Category combinations
productSchema.index({
  inStock: 1,
  category: 1,
  published: 1,
});

// Condition-based filtering
productSchema.index({
  condition: 1,
  itemCondition: 1,
  published: 1,
});

// 🔥 TEXT INDEX FOR SEARCH FUNCTIONALITY 🔥
productSchema.index(
  {
    name: "text",
    brand: "text",
    model: "text",
    description: "text",
    sku: "text",
    referenceNumber: "text",
    seoKeywords: "text",
  },
  {
    name: "product_search_index",
    weights: {
      name: 10,
      brand: 8,
      model: 8,
      sku: 8,
      referenceNumber: 6,
      seoKeywords: 5,
      description: 1,
    },
  }
);

// Virtual for checking if product is on sale
productSchema.virtual("isOnSale").get(function () {
  return this.salePrice > 0 && this.salePrice < this.regularPrice;
});

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  if (
    this.salePrice > 0 &&
    this.salePrice < this.regularPrice &&
    this.regularPrice > 0
  ) {
    return Math.round(
      ((this.regularPrice - this.salePrice) / this.regularPrice) * 100
    );
  }
  return 0;
});

// Pre-save middleware to generate name if not provided
productSchema.pre("save", function (next) {
  if (!this.name && this.brand && this.model) {
    this.name = `${this.brand} ${this.model}`;
  }
  next();
});

module.exports = mongoose.model("Product", productSchema, "products");
