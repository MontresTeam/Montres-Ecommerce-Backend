const mongoose = require("mongoose")

const seoPageSchema = new mongoose.Schema(
  {
    pageTitle: { type: String, required: true, trim: true },
    seoTitle: { type: String, required: true, trim: true },
    metaDescription: { type: String, required: true, trim: true, maxlength: 300 },
    slug: { type: String, required: true, unique: true, trim: true }, // "/" , "/watches"
    pageContent: { type: String, default: "" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);


module.exports = mongoose.model('SeoPage',seoPageSchema)
