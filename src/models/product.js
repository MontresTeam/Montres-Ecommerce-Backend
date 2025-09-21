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
    categorisOne: {String},
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

module.exports = mongoose.model("Product", productSchema, "products");
