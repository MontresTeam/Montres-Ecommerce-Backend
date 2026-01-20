const mongoose = require("mongoose");

const seoPageSchema = new mongoose.Schema(
  {
    seoTitle: { type: String, required: true, trim: true },
    metaDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    slug: { type: String, required: true, unique: true, trim: true },

    pageTitle: { type: String, default: "" },
    pageContent: { type: String, default: "" },

    pageType: {
      type: String,
      enum: ["page", "category", "brand", "product", "custom"],
      default: "page",
    },

    // --- Admin / SEO Control ---
    isActive: { type: Boolean, default: true },
    views: { type: Number, default: 0 },
    keywordRank: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeoPage", seoPageSchema);
