const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToS3 } = require("./s3Client");

// Ensure upload folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
const uploader = upload.fields([{ name: "featuredImage", maxCount: 1 }]);

const blogImageUpload = (req, res, next) => {
  uploader(req, res, async (err) => {
    if (err) {
      console.error("❌ Multer error:", err);
      return res.status(400).json({ message: err.message });
    }

    try {
      const uploadedImages = [];

      // Upload featured image if exists
      if (req.files && req.files.featuredImage && req.files.featuredImage.length > 0) {
        const file = req.files.featuredImage[0];
        const s3Key = `MontresBlogs/${Date.now()}-${file.originalname}`;
        const url = await uploadToS3(file.path, s3Key, file.mimetype);
        uploadedImages.push({ url, type: "featured", alt: file.originalname });

        // Clean up local file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      }

      // Attach uploaded images to request
      req.body.images = uploadedImages;

      if (typeof next === "function") {
        next();
      } else {
        console.error("❌ 'next' is not a function in blogImageUpload");
        res.status(500).json({ message: "Internal middleware error" });
      }
    } catch (error) {
      console.error("❌ S3 upload error:", error);
      res.status(500).json({ message: "Error uploading images to S3", error: error.message });
    }
  });
};

module.exports = blogImageUpload;
