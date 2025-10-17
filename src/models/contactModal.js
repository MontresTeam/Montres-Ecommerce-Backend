const mongoose = require("mongoose");

const contactFormSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "AE",
      enum: {
        values: ["AE", "SA", "KW", "QA", "BH", "OM", "US", "UK", "CA"],
        message: "Invalid country code",
      },
    },
    companyName: {
      type: String,
      trim: true,
    },

    // ✅ Subject or Inquiry Type
    subject: {
      type: String,
      required: [true, "Subject / Inquiry Type is required"],
      enum: {
        values: [
          "Product Information",
          "Order Support",
          "Return Request",
          "Billing Question",
          "Partnership Inquiry",
          "Other",
        ],
        message: "Invalid subject type",
      },
    },

    // ✅ Message field
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    // ✅ File attachment
    attachment: {
      type: String, // store file path or URL (if using AWS S3, Cloudinary, etc.)
      validate: {
        validator: function (v) {
          if (!v) return true; // optional
          const allowedExtensions = /\.(pdf|doc|docx|jpg|jpeg|png)$/i;
          return allowedExtensions.test(v);
        },
        message:
          "Invalid file type. Only PDF, DOC, JPG, or PNG files are allowed.",
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactForm", contactFormSchema);
