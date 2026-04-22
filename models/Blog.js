const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String }, // Short summary for listing pages
    content: { type: String }, // HTML rich text from editor
    featuredImage: { type: String },
    images: [{ type: String }], // Gallery or additional images
    author: {
        name: { type: String },
        image: { type: String },
        designation: { type: String }, // e.g., "Senior Watch Specialist"
    },
    category: {
        type: String,
        enum: [
            'Watch Guides',
            'Buying Tips',
            'Brand Stories',
            'Watch Education',
            'Market & News',
            'Collectors & Lifestyle'
        ],
        required: false,
        default: 'Watch Education'
    },
    tags: [{ type: String }],
    status: {
        type: String,
        enum: ['draft', 'published', 'scheduled'],
        default: 'draft'
    },
    publishDate: { type: Date },
    readingTime: { type: Number, default: 0 },
    seo: {
        metaTitle: { type: String },
        metaDescription: { type: String },
        metaKeywords: [{ type: String }],
        canonicalUrl: { type: String },
        ogImage: { type: String }
    },
    views: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    isCommentsEnabled: { type: Boolean, default: true }
}, {
    timestamps: true
});

module.exports = mongoose.model('Blog', BlogSchema);
