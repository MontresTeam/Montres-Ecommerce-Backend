const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String },
    content: { type: String }, // HTML content from WYSIWYG
    featuredImage: { type: String },
    category: {
        type: String,
        enum: [
            "Luxury Watches",
            "Pre-Owned Watches",
            "Watch Investment Guide",
            "Watch Buying Guide",
            "Watch Care & Maintenance",
            "Swiss Watch Brands",
            "Limited Edition Watches",
            "Luxury Bags",
            "Bag Authentication Guide",
            "Leather Accessories",
            "UAE Luxury Market",
            "Brand Spotlight",
            "Collector's Guide",
            "Industry News",
            "Style & Fashion"
        ]
    },
    tags: [{ type: String }],
    author: { type: String },
    status: {
        type: String,
        enum: ['Draft', 'Published', 'Scheduled'],
        default: 'Draft'
    },
    publishedAt: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('Blog', BlogSchema);

