const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String },
    type: { type: String, enum: ["main", "cover"], default: "cover" },
  },
  { _id: false }
);

const AccessoriesSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: [
      "Writing Instruments",
      "Cufflinks",
      "Bracelets",
      "Keychains & Charms",
      "Travel & Lifestyle",
      "Home Accessories",
      "Sunglasses / Eyewear Accessories",
    ],
    required: true,
  },

  subCategory: {
    type: String,
    enum: [
      "Fountain Pens",
      "Ballpoint Pens",
      "Rollerball Pens",
      "Mechanical Pencils",
      "Pen Sets",
      "Metal Cufflinks",
      "Enamel Cufflinks",
      "Pearl Cufflinks",
      "Designer Cufflinks",
      "Vintage Cufflinks",
      "Chain Bracelets",
      "Bangle Bracelets",
      "Charm Bracelets",
      "Leather Bracelets",
      "Beaded Bracelets",
      "Keychains",
      "Bag Charms",
      "Purse Accessories",
      "Luggage Tags",
      "Multi-tools",
      "Wallets",
      "Passport Covers",
      "Travel Kits",
      "Tech Accessories",
      "Drinkware",
      "Desk Organizers",
      "Photo Frames",
      "Decorative Items",
      "Clocks",
      "Vases",
      "Sunglasses Cases",
      "Eyeglass Chains",
      "Lens Cleaning Kits",
      "Eyewear Repair Kits",
    ],
  },

  brand: { type: String },
  model: { type: String },
  additionalTitle: { type: String },
  serialNumber: { type: String },
  productionYear: { type: Number },
  approximateYear: { type: Boolean, default: false },
  unknownYear: { type: Boolean, default: false },
  gender: { type: String, enum: ["Men/Unisex", "Women"] },

  condition: {
    type: String,
    enum: ["Brand New", "Unworn / Like New", "Pre-Owned", "Excellent", "Not Working / For Parts"],
  },

  itemCondition: {
    type: String,
    enum: ["Excellent", "Good", "Fair", "Poor / Not Working / For Parts"],
  },

  material: {
    type: [String],
    enum: [
      "Stainless Steel",
      "Leather",
      "Resin",
      "Silver",
      "Gold",
      "Platinum",
      "Titanium",
      "Brass",
      "Copper",
      "Ceramic",
      "Wood",
      "Fabric",
      "Plastic",
      "Crystal",
      "Pearl",
      "Enamel",
    ],
  },

  color: {
    type: [String],
    enum: [
      "Black",
      "White",
      "Silver",
      "Gold",
      "Rose Gold",
      "Brown",
      "Blue",
      "Red",
      "Green",
      "Purple",
      "Pink",
      "Yellow",
      "Orange",
      "Gray",
      "Multi-color",
      "Transparent",
      "Metallic",
      "Chrome",
      "Gunmetal",
    ],
  },

  accessoriesAndDelivery: {
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
    ],
  },

  scopeOfDeliveryOptions: {
    type: [String],
    enum: [
      "Original packaging",
      "With papers",
      "Without papers",
      "Original box only",
      "Generic packaging",
    ],
  },

  taxStatus: {
    type: String,
    enum: ["taxable", "shipping", "none"],
    default: "taxable",
  },

  stockQuantity: { type: Number, default: 0 },
  inStock: { type: Boolean, default: true },

  badges: {
    type: [String],
    enum: ["Popular", "New Arrivals"],
    default: [],
  },

  images: [imageSchema],

  seoTitle: { type: String },
  seoDescription: { type: String },
  seoKeywords: [{ type: String }],

  retailPrice: { type: Number },
  sellingPrice: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model("Accessory", AccessoriesSchema);
