const Blog = require('../models/Blog');
const mongoose = require('mongoose');

// Helper to calculate reading time
const calculateReadingTime = (content) => {
    const wordsPerMinute = 200;
    const text = content ? content.replace(/<[^>]*>/g, '') : ""; // Remove HTML tags
    const words = text.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
};

const createBlog = async (req, res, next) => {
    try {
        const {
            title, slug, excerpt, content, category, tags,
            authorName, authorDesignation, authorImage,
            status, featuredImage, images,
            metaTitle, metaDescription, metaKeywords, canonicalUrl, ogImage,
            featured, publishDate, isCommentsEnabled
        } = req.body;

        if (!title || !slug) {
            return res.status(400).json({ success: false, message: "Title and Slug are required" });
        }

        const existingBlog = await Blog.findOne({ slug });
        if (existingBlog) {
            return res.status(400).json({ success: false, message: "Slug already exists." });
        }

        const readingTime = calculateReadingTime(content || "");

        // Map flat fields to nested objects for the professional schema
        const newBlog = new Blog({
            title,
            slug,
            excerpt,
            content,
            category: category && category !== "" ? category : 'Watch Education',
            tags: typeof tags === 'string' ? JSON.parse(tags) : (tags || []),
            author: {
                name: authorName || req.body.author, // Fallback to 'author' if sent as string
                designation: authorDesignation || "Editorial Team",
                image: authorImage || ""
            },
            status: status ? status.toLowerCase() : 'draft',
            readingTime,
            featured: featured === 'true' || featured === true,
            seo: {
                metaTitle: metaTitle || title,
                metaDescription: metaDescription || excerpt,
                metaKeywords: typeof metaKeywords === 'string' ? JSON.parse(metaKeywords) : (metaKeywords || []),
                canonicalUrl: canonicalUrl || "",
                ogImage: ogImage || ""
            },
            isCommentsEnabled: isCommentsEnabled === 'true' || isCommentsEnabled === true,
            images: typeof images === 'string' ? JSON.parse(images) : (images || []),
            featuredImage: (req.body.images && req.body.images.length > 0) ? req.body.images[0].url : (featuredImage || ""),
            publishDate: publishDate ? new Date(publishDate) : (status?.toLowerCase() === 'published' ? new Date() : null)
        });

        await newBlog.save();
        res.status(201).json({ success: true, message: "Blog created successfully", blog: newBlog });
    } catch (error) {
        console.error("Create Blog Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getBlogs = async (req, res) => {
    try {
        const { status, category, search, page = 1, limit = 10 } = req.query;
        const query = {};

        if (status) query.status = status.toLowerCase();
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };

        const blogs = await Blog.find(query)
            .sort({ publishDate: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const count = await Blog.countDocuments(query);

        res.status(200).json({
            success: true,
            blogs,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        let blog;

        if (mongoose.Types.ObjectId.isValid(id)) {
            blog = await Blog.findByIdAndUpdate(id, { $inc: { views: 1 } }, { new: true });
        }

        if (!blog) {
            blog = await Blog.findOneAndUpdate({ slug: id }, { $inc: { views: 1 } }, { new: true });
        }

        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        res.status(200).json({ success: true, blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const body = { ...req.body };

        // Parsing JSON strings if sent from FormData
        const tags = typeof body.tags === 'string' ? JSON.parse(body.tags) : body.tags;
        const metaKeywords = typeof body.metaKeywords === 'string' ? JSON.parse(body.metaKeywords) : body.metaKeywords;
        const images = typeof body.images === 'string' ? JSON.parse(body.images) : body.images;

        const updateData = {
            title: body.title,
            slug: body.slug,
            excerpt: body.excerpt,
            content: body.content,
            category: body.category || 'Watch Education',
            tags: tags,
            author: {
                name: body.authorName || body.author,
                designation: body.authorDesignation,
                image: body.authorImage
            },
            status: body.status ? body.status.toLowerCase() : undefined,
            featured: body.featured === 'true' || body.featured === true,
            seo: {
                metaTitle: body.metaTitle,
                metaDescription: body.metaDescription,
                metaKeywords: metaKeywords,
                canonicalUrl: body.canonicalUrl,
                ogImage: body.ogImage
            },
            isCommentsEnabled: body.isCommentsEnabled === 'true' || body.isCommentsEnabled === true,
            images: images,
            publishDate: body.publishDate ? new Date(body.publishDate) : undefined
        };

        if (body.content) {
            updateData.readingTime = calculateReadingTime(body.content);
        }

        if (req.body.images && req.body.images.length > 0) {
            updateData.featuredImage = req.body.images[0].url;
        } else if (body.featuredImage) {
            updateData.featuredImage = body.featuredImage;
        }

        const updatedBlog = await Blog.findByIdAndUpdate(id, { $set: updateData }, { new: true });

        if (!updatedBlog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        res.status(200).json({ success: true, message: "Blog updated successfully", blog: updatedBlog });
    } catch (error) {
        console.error("Update Blog Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        await Blog.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog };
