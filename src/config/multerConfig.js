const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer to store temporarily on local server
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'uploads'), // Temporary folder
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

const imageUpload = (req, res, next) => {
    upload.single("image")(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded. Please upload with key 'image'." });
        }

        try {
            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "MontresTradingLLC",
                quality: "auto",
                fetch_format: "auto"
            });

            req.body.image = result.secure_url;

            // Delete local file
            fs.unlink(req.file.path, (error) => {
                if (error) console.log("Error deleting local file:", error);
            });

            next();
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Error uploading file to Cloudinary" });
        }
    });
};


module.exports = imageUpload;
