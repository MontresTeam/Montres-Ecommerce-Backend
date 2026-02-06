const express = require("express");
const router = express.Router();
const {
  submitContactForm,
  getAllContacts,
  deleteContact,
} = require("../controllers/contactFormController");
const imageUpload = require("../config/multerConfig");


// 📩 Submit contact form (with Cloudinary upload)
router.post("/submit", imageUpload, submitContactForm);

// 📜 Get all contact submissions
router.get("/", getAllContacts);

// 🗑 Delete contact
router.delete("/:id", deleteContact);

module.exports = router;
