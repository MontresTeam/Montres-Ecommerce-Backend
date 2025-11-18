const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// ================================
// 🔧 Cloudinary Configuration
// ================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================================
// 📁 Multer Temporary Storage Setup
// ================================
const uploadDir = path.join(__dirname, "../uploads"); // better to store outside this file’s folder

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // ✅ Optional: restrict file types for safety
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.test(ext)) {
      return cb(new Error("Only image files (jpg, png, webp) are allowed"));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // ✅ limit to 5MB
});

// ================================
// ☁️ Middleware for Image Upload + Update
// ================================
const imageUploadUpdate = (req, res, next) => {
  upload.any()(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      const uploadedImages = [];

      // 🧩 Upload new images to Cloudinary
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "MontresTradingLLC/ProfileImages",
            resource_type: "image",
            transformation: [
              { width: 600, height: 600, crop: "limit" }, // resize limit
              { quality: "auto", fetch_format: "auto" },
            ],
          });

          uploadedImages.push({
            url: result.secure_url,
            public_id: result.public_id, // store this if you want to delete later
            alt: file.originalname,
          });

          // 🧹 Delete temporary local file
          fs.unlink(file.path, (error) => {
            if (error) console.error("Error deleting local file:", error);
          });
        }
      }

      // 🧩 Merge existing images (from frontend)
      let existingImages = [];
      if (req.body.existingImages) {
        try {
          existingImages = JSON.parse(req.body.existingImages);
        } catch {
          existingImages = Array.isArray(req.body.existingImages)
            ? req.body.existingImages
            : [];
        }
      }

      req.body.images = [...existingImages, ...uploadedImages];
      next();
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return res.status(500).json({
        message: "Error uploading images to Cloudinary",
        error: error.message,
      });
    }
  });
};

module.exports = imageUploadUpdate;
