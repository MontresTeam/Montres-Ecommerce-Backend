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
      enum: ["AE", "SA", "KW", "QA", "BH", "OM", "US", "UK", "CA"],
    },

    companyName: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      enum: [
        "Product Information",
        "Order Support",
        "Return Request",
        "Billing Question",
        "Partnership Inquiry",
        "Other",
      ],
    },

    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    // ✅ OPTIONAL attachment
    attachment: {
      type: String,
      default: "", // ← important
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactForm", contactFormSchema);
