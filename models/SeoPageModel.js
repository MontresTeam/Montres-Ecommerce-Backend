const mongoose = require("mongoose");

const seoPageSchema = new mongoose.Schema(
  {
    pageTitle: { type: String, default: "", trim: true },
    seoTitle: { type: String, required: true, trim: true },
    metaDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500, // Increased for professional meta descriptions
    },
    metaKeywords: [{ type: String, trim: true }],
    slug: { type: String, required: true, unique: true, trim: true },
    canonicalUrl: { type: String, trim: true },
    ogImage: { type: String, trim: true },
    robots: { type: String, default: "index, follow", trim: true },
    structuredData: { type: String, trim: true }, // For JSON-LD or custom schema

    pageContent: { type: String, default: "" },

    pageType: {
      type: String,
      enum: ["page", "category", "brand", "product", "custom"],
      default: "page",
    },

    author: { type: String, trim: true },

    // --- Admin / SEO Control ---
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    keywordRank: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeoPage", seoPageSchema);
