const ContactForm = require("../models/contactModal");
const sendEmail = require("../utils/sendEmail");
const validator = require("validator");

/**
 * 📩 Submit Contact Form
 * Includes server-side validation and sanitization for security.
 */
exports.submitContactForm = async (req, res) => {
  try {
    let {
      fullName,
      email,
      phone,
      country,
      companyName,
      subject,
      message,
    } = req.body;

    // 1️⃣ Basic Validation
    if (!fullName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Full Name, Email, and Message are required fields.",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // 2️⃣ Basic Sanitization to prevent XSS in emails/admin panel
    // We escape HTML characters
    fullName = validator.escape(fullName.trim());
    email = email.trim().toLowerCase();
    subject = subject ? validator.escape(subject.trim()) : "No Subject";
    message = validator.escape(message.trim());
    phone = phone ? validator.escape(phone.trim()) : "";
    country = country ? validator.escape(country.trim()) : "";
    companyName = companyName ? validator.escape(companyName.trim()) : "";

    // ✅ Optional attachment handling
    let attachmentUrl = "";

    // Case 1: S3 upload (images array set by upload middleware)
    if (req.body.images && Array.isArray(req.body.images)) {
      if (req.body.images.length > 0) {
        attachmentUrl = req.body.images[0].url;
      }
    }

    // Case 2: Single uploaded file (multer only, no cloud upload)
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
      attachment: attachmentUrl,
    });

    await newContact.save();

    // 📩 Send Email Notification to Admin & Sales
    const adminEmails = [
      process.env.ADMIN_EMAIL || "farhan.dev24@gmail.com",
      process.env.SALES_EMAIL || "farhan.dev24@gmail.com"
    ];
    const emailSubject = `New Contact Inquiry: ${subject}`;
    
    // We use the escaped message for safety
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #000; border-bottom: 2px solid #C6A96B; padding-bottom: 10px; text-align: center;">Montres Trading L.L.C – The Art Of Time</h2>
        <p style="text-align: center; color: #666;">New Inquiry Received from Website</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #fafafa; border-radius: 5px;">
          <tr><td style="padding: 10px; font-weight: bold; width: 120px; border-bottom: 1px solid #eee;">Name:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${fullName}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Email:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${email}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Phone:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${phone || "N/A"}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Country:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${country || "N/A"}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #eee;">Company:</td><td style="padding: 10px; border-bottom: 1px solid #eee;">${companyName || "N/A"}</td></tr>
          <tr><td style="padding: 10px; font-weight: bold;">Subject:</td><td style="padding: 10px;">${subject}</td></tr>
        </table>

        <p><strong>Message:</strong></p>
        <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd; white-space: pre-wrap;">${message}</div>

        ${attachmentUrl ? `<p style="margin-top: 20px;"><strong>Attachment:</strong> <a href="${attachmentUrl}" style="color: #C6A96B;">View File</a></p>` : ""}
        
        <footer style="margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
          <p>Sent from Montres Store (www.montres.ae)</p>
          <p>© ${new Date().getFullYear()} Montres Trading L.L.C</p>
        </footer>
      </div>
    `;
    const textContent = `New Contact Inquiry from: ${fullName}\nEmail: ${email}\nPhone: ${phone || "N/A"}\nCountry: ${country || "N/A"}\nCompany: ${companyName || "N/A"}\nSubject: ${subject}\n\nMessage:\n${message}`;

    // Send to both emails (parallel)
    await Promise.all(
      adminEmails.map((toEmail) => sendEmail(toEmail, emailSubject, htmlContent, textContent))
    ).catch(err => console.error("Email delivery failed:", err.message));

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

// 📜 Get single contact submission
exports.getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await ContactForm.findById(id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching contact submission.",
      error: error.message,
    });
  }
};
