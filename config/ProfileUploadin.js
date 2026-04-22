const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { uploadToS3 } = require("./s3Client");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.test(ext)) return cb(new Error("Only images allowed"));
    cb(null, true);
  },
});

const imageUploadUpdate = (req, res, next) => {
  upload.single("profilePicture")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    try {
      // Handle file upload (multipart/form-data)
      if (req.file) {
        const s3Key = `MontresTradingLLC/ProfileImages/${Date.now()}-${req.file.originalname.replace(/\s+/g, "_")}`;
        const url = await uploadToS3(req.file.path, s3Key, req.file.mimetype);
        req.body.profilePicture = url;
        fs.unlink(req.file.path, () => {}); // delete temp file
      }
      // Handle base64 string (application/json) — upload as buffer
      else if (req.body.profilePicture && req.body.profilePicture.startsWith("data:image/")) {
        const base64Data = req.body.profilePicture.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const mimeMatch = req.body.profilePicture.match(/data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const ext = mimeType.split("/")[1];
        const s3Key = `MontresTradingLLC/ProfileImages/${Date.now()}-profile.${ext}`;

        const AWS = require("aws-sdk");
        const s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_KEY,
          region: process.env.AWS_REGION,
        });

        const result = await s3
          .upload({
            Bucket: process.env.S3_BUCKET,
            Key: s3Key,
            Body: buffer,
            ContentType: mimeType,
          })
          .promise();

        req.body.profilePicture = result.Location;
      }

      next();
    } catch (error) {
      console.error("S3 upload error:", error);
      return res.status(500).json({ message: "Error uploading image", error: error.message });
    }
  });
};

module.exports = imageUploadUpdate;
