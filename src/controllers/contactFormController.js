const ContactForm = require("../models/contactModal");

// 📩 Submit Contact Form
exports.submitContactForm = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      country,
      companyName,
      subject,
      message,
    } = req.body;

    // ✅ Optional attachment handling
    let attachmentUrl = "";

    // Case 1: Cloudinary upload (images array)
    if (req.body.images && Array.isArray(req.body.images)) {
      if (req.body.images.length > 0) {
        attachmentUrl = req.body.images[0].url;
      }
    }

    // Case 2: Single uploaded file (multer / cloudinary)
    if (req.file && req.file.path) {
      attachmentUrl = req.file.path;
    }

    const newContact = new ContactForm({
      fullName,
      email,
      phone,
      country,
      companyName,
      subject,
      message,
      attachment: attachmentUrl, // ← empty string if not uploaded
    });

    await newContact.save();

    res.status(201).json({
      success: true,
      message: "Your inquiry has been submitted successfully!",
      data: newContact,
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while submitting the form.",
      error: error.message,
    });
  }
};




// 📜 Get all contact form submissions (admin use)
exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await ContactForm.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact submissions.",
      error: error.message,
    });
  }
};

// 🗑 Delete contact form (admin)
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await ContactForm.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting contact form entry.",
      error: error.message,
    });
  }
};
