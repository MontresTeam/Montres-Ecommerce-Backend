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

// Leather Goods specific enums
const LEATHER_MAIN_CATEGORIES = [
  "Hand Bag", "Wallet", "Card Holder", "Belt", "Briefcase", "Pouch"
];

const LEATHER_SUB_CATEGORIES = [
  "Tote Bag", "Crossbody Bag", "shoulder/crossbody bag", "Shoulder Bag", 
  "Clutch", "Backpack", "Passport Holder", "Reversible Belt", "Executive Case"
];

const LEATHER_MATERIALS = [
  "Full-grain leather", "Top-grain leather", "Genuine leather", "Suede",
  "Patent leather", "Saffiano leather", "Croc-embossed", "Pebble leather",
  "Canvas + Leather mix", "Vegan Leather (PU)", "Leather", "Fabric"
];

const INTERIOR_MATERIALS = [
  "Fabric", "Canvas", "Leather", "Suede", "Microfiber", "Textile", "Nylon",
  "Polyester", "Felt", "Satin", "Silk", "Cotton", "Wool Blend", "Alcantara"
];

const HARDWARE_COLORS = [
  "Gold", "Rose Gold", "Silver", "Platinum", "Chrome", "Gunmetal", 
  "Black Metal", "Brass", "Matte Gold", "Matte Silver", "Ruthenium", 
  "Palladium", "Antique Gold", "Antique Silver"
];

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

const sizeSchema = new mongoose.Schema(
  {
    width: { type: Number },
    height: { type: Number },
    depth: { type: Number },
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
    
    // Category Information
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
    
    // ────────────── WATCH SPECIFIC FIELDS ──────────────
    watchType: {
      type: String,
      enum: WATCH_TYPES,
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

    // ────────────── LEATHER GOODS SPECIFIC FIELDS ──────────────
    leatherMainCategory: {
      type: String,
      enum: LEATHER_MAIN_CATEGORIES,
    },
    leatherSubCategory: {
      type: String,
      enum: LEATHER_SUB_CATEGORIES,
    },
    modelCode: { type: String },
    leatherMaterial: {
      type: String,
      enum: LEATHER_MATERIALS,
    },
    interiorMaterial: {
      type: String,
      enum: INTERIOR_MATERIALS,
    },
    hardwareColor: {
      type: String,
      enum: HARDWARE_COLORS,
    },
    name:{type:String},
    conditionNotes: { type: String },
    leatherSize: sizeSchema,
    strapLength: { type: Number },
    leatherAccessories: {
      type: [String],
      enum: [
        "Original box",
        "Dust bag",
        "Certificate of authenticity",
        "Care instructions",
        "Warranty card",
        "Gift box",
        "User manual",
        "Extra links",
        "Cleaning cloth",
        "Adjustment tools",
        "Only bag",
      ],
    },
    leatherScopeOfDelivery: {
      type: [String],
      enum: [
        "Original packaging",
        "With papers",
        "Without papers",
        "Original box only",
        "Generic packaging",
        "Dust bag",
        "Only bag",
      ],
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
    
    // ────────────── WATCH SPECIFIC FEATURES ──────────────
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
    sold: { type: Number, default: 0 },
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
    retailPrice: { type: Number }, // For leather goods
    sellingPrice: { type: Number }, // For leather goods
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
productSchema.index({ category: 1 });
productSchema.index({ watchType: 1 });
productSchema.index({ watchStyle: 1 });
productSchema.index({ leatherMainCategory: 1 });
productSchema.index({ leatherSubCategory: 1 });
productSchema.index({ gender: 1 });
productSchema.index({ condition: 1 });
productSchema.index({ itemCondition: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ updatedAt: -1 });

// Array Field Indexes
productSchema.index({ includedAccessories: 1 });
productSchema.index({ leatherAccessories: 1 });
productSchema.index({ functions: 1 });
productSchema.index({ replacementParts: 1 });
productSchema.index({ seoKeywords: 1 });

// Price-related Indexes
productSchema.index({ salePrice: 1 });
productSchema.index({ regularPrice: 1 });
productSchema.index({ sellingPrice: 1 });
productSchema.index({ retailPrice: 1 });

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

// Leather Goods specific indexes
productSchema.index({
  category: 1,
  leatherMainCategory: 1,
  published: 1,
});

productSchema.index({
  category: 1,
  leatherSubCategory: 1,
  published: 1,
});

// Watch specific indexes
productSchema.index({
  category: 1,
  watchType: 1,
  published: 1,
});

productSchema.index({
  watchType: 1,
  watchStyle: 1,
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
    modelCode: "text",
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
      modelCode: 6,
      seoKeywords: 5,
      description: 1,
    },
  }
);

// Virtual for checking if product is on sale
productSchema.virtual("isOnSale").get(function () {
  if (this.category === "Leather Goods" || this.category === "Leather Bags") {
    return this.sellingPrice > 0 && this.sellingPrice < this.retailPrice;
  }
  return this.salePrice > 0 && this.salePrice < this.regularPrice;
});

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function () {
  let regularPrice, salePrice;
  
  if (this.category === "Leather Goods" || this.category === "Leather Bags") {
    regularPrice = this.retailPrice;
    salePrice = this.sellingPrice;
  } else {
    regularPrice = this.regularPrice;
    salePrice = this.salePrice;
  }
  
  if (salePrice > 0 && salePrice < regularPrice && regularPrice > 0) {
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  }
  return 0;
});

// Virtual for display price
productSchema.virtual("displayPrice").get(function () {
  if (this.category === "Leather Goods" || this.category === "Leather Bags") {
    return this.sellingPrice > 0 ? this.sellingPrice : this.retailPrice;
  }
  return this.salePrice > 0 ? this.salePrice : this.regularPrice;
});

// Virtual for original price
productSchema.virtual("originalPrice").get(function () {
  if (this.category === "Leather Goods" || this.category === "Leather Bags") {
    return this.retailPrice;
  }
  return this.regularPrice;
});

// Pre-save middleware to generate name if not provided
productSchema.pre("save", function (next) {
  if (!this.name && this.brand && this.model) {
    this.name = `${this.brand} ${this.model}`;
  }
  
  // Sync pricing for leather goods
  if ((this.category === "Leather Goods" || this.category === "Leather Bags") && !this.sellingPrice) {
    this.sellingPrice = this.retailPrice;
  }
  
  // Sync pricing for other categories
  if (this.category !== "Leather Goods" && this.category !== "Leather Bags" && !this.salePrice) {
    this.salePrice = this.regularPrice;
  }
  
  next();
});

// Method to get category-specific fields
productSchema.methods.getCategoryFields = function() {
  const baseFields = {
    brand: this.brand,
    model: this.model,
    sku: this.sku,
    category: this.category,
    // ... other common fields
  };
  
  if (this.category === "Watch") {
    return {
      ...baseFields,
      watchType: this.watchType,
      movement: this.movement,
      caseSize: this.caseSize,
      // ... other watch fields
    };
  }
  
  if (this.category === "Leather Goods" || this.category === "Leather Bags") {
    return {
      ...baseFields,
      leatherMainCategory: this.leatherMainCategory,
      leatherMaterial: this.leatherMaterial,
      leatherSize: this.leatherSize,
      // ... other leather goods fields
    };
  }
  
  return baseFields;
};

module.exports = mongoose.model("Product", productSchema, "products");