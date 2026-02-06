const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// ✅ Cloudinary is assumed to be configured globally

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `admin-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Middleware to handle optional profile upload
const uploadAdminProfile = (req, res, next) => {
  const uploader = upload.single("profile");

  uploader(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    // No file uploaded, just continue
    if (!req.file) return next();

    try {
      // Upload file to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "MontresAdminProfiles",
      });

      // Remove local file
      fs.unlinkSync(req.file.path);

      // Attach Cloudinary URL to request body
      req.body.profileUrl = result.secure_url;

      next();
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      res.status(500).json({ message: "Error uploading profile image" });
    }
  });
};

module.exports = uploadAdminProfile;
