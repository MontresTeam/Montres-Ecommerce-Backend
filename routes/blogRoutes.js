const express = require('express');
const { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog } = require('../controllers/blogController');
const blogImageUpload = require('../config/blogImageUpload');
const { adminProtect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public routes (if any)
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// Protected admin routes
router.use(adminProtect);
router.post('/add', blogImageUpload, createBlog);
router.put('/:id', blogImageUpload, updateBlog);
router.delete('/:id', deleteBlog);

module.exports = router;
