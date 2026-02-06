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

const addProductImageUpload = (req, res, next) => {
  const uploader = upload.fields([
    { name: "main", maxCount: 1 },
    { name: "covers", maxCount: 10 },
  ]);

  uploader(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    console.log("🔥 req.files =>", req.files);
    console.log("🔥 req.body =>", req.body);

    try {
      const uploadedImages = [];

      // ✅ Upload main image if exists
      if (req.files && req.files.main && req.files.main.length > 0) {
        const mainFile = req.files.main[0];
        const result = await cloudinary.uploader.upload(mainFile.path, {
          folder: "MontresTradingLLC",
        });
        uploadedImages.push({
          url: result.secure_url,
          type: "main",
          alt: mainFile.originalname,
        });
        fs.unlinkSync(mainFile.path);
      }

      // ✅ Upload cover images if exists
      if (req.files && req.files.covers && req.files.covers.length > 0) {
        for (const file of req.files.covers) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "MontresTradingLLC",
          });
          uploadedImages.push({
            url: result.secure_url,
            type: "cover",
            alt: file.originalname,
          });
          fs.unlinkSync(file.path);
        }
      }

      console.log("✅ Uploaded Images:", uploadedImages);

      // ✅ Attach uploaded images to request
      req.body.images = uploadedImages;

      next();
    } catch (error) {
      console.error("❌ Cloudinary upload error:", error);
      res.status(500).json({ message: "Error uploading images" });
    }
  });
};

module.exports = AccessoriesProductImageUpload;
