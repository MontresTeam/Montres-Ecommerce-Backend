const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToS3 } = require("./s3Client");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
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
      const s3Key = `MontresAdminProfiles/${Date.now()}-${req.file.originalname}`;
      const url = await uploadToS3(req.file.path, s3Key, req.file.mimetype);

      // Remove local file
      fs.unlinkSync(req.file.path);

      // Attach S3 URL to request body
      req.body.profileUrl = url;

      next();
    } catch (error) {
      console.error("S3 upload error:", error);
      res.status(500).json({ message: "Error uploading profile image to S3" });
    }
  });
};

module.exports = uploadAdminProfile;
