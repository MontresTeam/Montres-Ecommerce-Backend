// config/updateProductImageUpload.js
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToS3 } = require("./s3Client");

// Multer storage
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Middleware for UPDATE operations
const updateProductImageUpload = async (req, res, next) => {
  const uploader = upload.fields([
    { name: "main", maxCount: 1 },
    { name: "covers", maxCount: 10 },
  ]);

  uploader(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      const uploadedImages = [];

      // Main image
      if (req.files?.main) {
        const mainFile = req.files.main[0];
        const s3Key = `MontresTradingLLC/${Date.now()}-${mainFile.originalname}`;
        const url = await uploadToS3(mainFile.path, s3Key, mainFile.mimetype);
        uploadedImages.push({ url, type: "main", alt: mainFile.originalname });
        fs.unlink(mainFile.path, () => {});
      }

      // Cover images
      if (req.files?.covers) {
        for (const file of req.files.covers) {
          const s3Key = `MontresTradingLLC/${Date.now()}-${file.originalname}`;
          const url = await uploadToS3(file.path, s3Key, file.mimetype);
          uploadedImages.push({ url, type: "cover", alt: file.originalname });
          fs.unlink(file.path, () => {});
        }
      }

      // Only set images if new files were uploaded
      if (uploadedImages.length > 0) {
        req.body.uploadedImages = uploadedImages;
      }

      next();
    } catch (error) {
      console.error("S3 upload error:", error);
      return res.status(500).json({ message: "Error uploading files to S3" });
    }
  });
};

module.exports = updateProductImageUpload;