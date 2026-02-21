const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// ✅ Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Ensure upload folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ✅ Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({ storage });
const uploader = upload.fields([
    { name: "featuredImage", maxCount: 1 }
]);

const blogImageUpload = (req, res, next) => {
    uploader(req, res, async (err) => {
        if (err) {
            console.error("❌ Multer error:", err);
            return res.status(400).json({ message: err.message });
        }

        try {
            const uploadedImages = [];

            // ✅ Upload featured image if exists
            if (req.files && req.files.featuredImage && req.files.featuredImage.length > 0) {
                const file = req.files.featuredImage[0];
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: "MontresBlogs",
                });
                uploadedImages.push({
                    url: result.secure_url,
                    type: "featured",
                    alt: file.originalname,
                });

                // Clean up local file
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }

            // ✅ Attach uploaded images to request
            req.body.images = uploadedImages;

            if (typeof next === 'function') {
                next();
            } else {
                console.error("❌ 'next' is not a function in blogImageUpload");
                res.status(500).json({ message: "Internal middleware error" });
            }
        } catch (error) {
            console.error("❌ Cloudinary upload error:", error);
            res.status(500).json({ message: "Error uploading images", error: error.message });
        }
    });
};


module.exports = blogImageUpload;
