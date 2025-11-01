const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer storage
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const upload = multer({ storage });

// Middleware for uploading product images
const addProductImageUpload = async (req, res, next) => {
  const uploader = upload.fields([
    { name: "main", maxCount: 1 },
    { name: "covers", maxCount: 5 }
  ]);

  uploader(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const uploadedImages = [];

      // Main image
      if (req.files?.main) {
        const mainResult = await cloudinary.uploader.upload(req.files.main[0].path, {
          folder: "MontresTradingLLC",
          quality: "auto",
          fetch_format: "auto"
        });
        uploadedImages.push({
          url: mainResult.secure_url,
          type: "main",
          alt: req.files.main[0].originalname
        });
        fs.unlink(req.files.main[0].path, () => {});
      }

      // Cover images
      if (req.files?.covers) {
        for (const file of req.files.covers) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "MontresTradingLLC",
            quality: "auto",
            fetch_format: "auto"
          });
          uploadedImages.push({
            url: result.secure_url,
            type: "cover",
            alt: file.originalname
          });
          fs.unlink(file.path, () => {});
        }
      }

      // If we have uploaded images, replace the images array
      if (uploadedImages.length > 0) {
        req.body.images = uploadedImages;
      }

      console.log("Processed images:", req.body.images);
      next();
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return res.status(500).json({ message: "Error uploading files to Cloudinary" });
    }
  });
};

module.exports = addProductImageUpload;