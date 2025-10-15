const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (temporary storage)
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/**
 * Middleware for handling mixed image updates:
 * - Keep old image URLs (sent as JSON string in req.body.existingImages)
 * - Upload new files (if any)
 */
const imageUploadUpdate = (req, res, next) => {
  upload.any()(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      let uploadedImages = [];

      // 🧩 Upload new images if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "MontresTradingLLC",
            quality: "auto",
            fetch_format: "auto",
          });

          uploadedImages.push({
            url: result.secure_url,
            alt: file.originalname,
          });

          // Clean up local file
          fs.unlink(file.path, (error) => {
            if (error) console.error("Error deleting local file:", error);
          });
        }
      }

      // 🧩 Merge with existing image URLs from frontend
      let existingImages = [];
      if (req.body.existingImages) {
        try {
          // handle both JSON string and array input
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
