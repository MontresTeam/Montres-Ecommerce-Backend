const Blog = require('../models/Blog');
const mongoose = require('mongoose');

const createBlog = async (req, res, next) => {

    console.log("📝 Create Blog Request Body:", JSON.stringify(req.body, null, 2));
    try {
        const { title, slug, excerpt, content, category, tags, author, status, featuredImage } = req.body;

        if (!title || !slug) {
            return res.status(400).json({
                success: false,
                message: "Title and Slug are required"
            });
        }

        // Check if slug already exists
        const existingBlog = await Blog.findOne({ slug });
        if (existingBlog) {
            return res.status(400).json({
                success: false,
                message: "Slug already exists. Please choose a different slug."
            });
        }

        console.log("🛠️ Creating new Blog instance...");
        const newBlog = new Blog({
            title,
            slug,
            excerpt,
            content,
            category,
            tags: typeof tags === 'string' ? JSON.parse(tags) : tags,
            author,
            status,
            featuredImage: req.body.images && req.body.images.length > 0 ? req.body.images[0].url : featuredImage,
            publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : (status === 'Published' ? new Date() : null)
        });

        console.log("💾 Saving blog to database...");
        await newBlog.save();
        console.log("✅ Blog saved successfully!");


        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            blog: newBlog
        });
    } catch (error) {
        console.error("❌ [Create Blog Error Full]:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating blog",
            error: error.message,
            stack: error.stack
        });
    }
};


const getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            blogs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching blogs",
            error: error.message
        });
    }
};

const getBlogById = async (req, res) => {
    try {
        const { id } = req.params;
        let blog;

        // Check if the id is a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(id)) {
            blog = await Blog.findById(id);
        }

        // If no blog found by ID, try searching by slug
        if (!blog) {
            blog = await Blog.findOne({ slug: id });
        }

        if (!blog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        res.status(200).json({ success: true, blog });
    } catch (error) {
        console.error("❌ Error fetching blog:", error);
        res.status(500).json({ success: false, message: "Error fetching blog" });
    }
};

const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (updateData.tags && typeof updateData.tags === 'string') {
            updateData.tags = JSON.parse(updateData.tags);
        }

        if (req.body.images && req.body.images.length > 0) {
            updateData.featuredImage = req.body.images[0].url;
        }

        if (updateData.status === 'Published' && !updateData.publishedAt) {
            updateData.publishedAt = new Date();
        }

        const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedBlog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }

        res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            blog: updatedBlog
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating blog", error: error.message });
    }
};

const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedBlog = await Blog.findByIdAndDelete(id);
        if (!deletedBlog) {
            return res.status(404).json({ success: false, message: "Blog not found" });
        }
        res.status(200).json({ success: true, message: "Blog deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting blog" });
    }
};

module.exports = {
    createBlog,
    getBlogs,
    getBlogById,
    updateBlog,
    deleteBlog
};
