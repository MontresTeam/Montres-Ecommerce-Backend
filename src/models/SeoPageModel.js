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

    pageContent: { type: String, default: "" },

    // --- Admin / SEO Control ---
    isActive: { type: Boolean, default: true }, // published / draft
    views: { type: Number, default: 0 }, // analytics
    keywordRank: { type: Number, default: 0 }, // editable metric
  },
  { timestamps: true }
);

module.exports = mongoose.model("SeoPage", seoPageSchema);
