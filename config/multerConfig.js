const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToS3 } = require("./s3Client");

// Configure Multer (temporary local storage)
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
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

    // If no files → just continue
    if (!req.files || req.files.length === 0) {
      req.body.images = [];
      return next();
    }

    try {
      const uploadedImages = [];

      for (const file of req.files) {
        const s3Key = `MontresTradingLLC/${Date.now()}-${file.originalname}`;
        const url = await uploadToS3(file.path, s3Key, file.mimetype);

        uploadedImages.push({
          url,
          alt: file.originalname,
        });

        // Remove local temp file
        fs.unlink(file.path, (error) => {
          if (error) console.error("File delete error:", error);
        });
      }

      req.body.images = uploadedImages;
      next();
    } catch (error) {
      console.error("S3 upload error:", error);
      return res.status(500).json({ message: "Error uploading files to S3" });
    }
  });
};

module.exports = imageUpload;
