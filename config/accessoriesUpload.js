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

const AccessoriesProductImageUpload = (req, res, next) => {
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

      // Upload main image if exists
      if (req.files && req.files.main && req.files.main.length > 0) {
        const mainFile = req.files.main[0];
        const s3Key = `MontresTradingLLC/${Date.now()}-${mainFile.originalname}`;
        const url = await uploadToS3(mainFile.path, s3Key, mainFile.mimetype);
        uploadedImages.push({ url, type: "main", alt: mainFile.originalname });
        fs.unlinkSync(mainFile.path);
      }

      // Upload cover images if exists
      if (req.files && req.files.covers && req.files.covers.length > 0) {
        for (const file of req.files.covers) {
          const s3Key = `MontresTradingLLC/${Date.now()}-${file.originalname}`;
          const url = await uploadToS3(file.path, s3Key, file.mimetype);
          uploadedImages.push({ url, type: "cover", alt: file.originalname });
          fs.unlinkSync(file.path);
        }
      }

      console.log("✅ Uploaded Images:", uploadedImages);

      // Attach uploaded images to request
      req.body.images = uploadedImages;
      next();
    } catch (error) {
      console.error("❌ S3 upload error:", error);
      res.status(500).json({ message: "Error uploading images to S3" });
    }
  });
};

module.exports = AccessoriesProductImageUpload;
