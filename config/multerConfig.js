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

// Configure Multer (temporary local storage)
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

const imageUpload = (req, res, next) => {
  upload.any()(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // ✅ IMPORTANT: If no files → just continue
    if (!req.files || req.files.length === 0) {
      req.body.images = []; // ensure safe default
      return next();
    }

    try {
      const uploadedImages = [];

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

        // Remove local file
        fs.unlink(file.path, (error) => {
          if (error) console.error("File delete error:", error);
        });
      }

      req.body.images = uploadedImages; // send to controller
      next();
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return res
        .status(500)
        .json({ message: "Error uploading files to Cloudinary" });
    }
  });
};

module.exports = imageUpload;
