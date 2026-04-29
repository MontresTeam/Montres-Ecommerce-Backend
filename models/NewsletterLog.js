const mongoose = require("mongoose");

const NewsletterLogSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  audience: {
    type: String,
    enum: ["all", "subscribers"],
    required: true,
  },
  recipientsCount: {
    type: Number,
    default: 0,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  failedCount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["pending", "sending", "completed", "failed"],
    default: "pending",
  },
  logs: [
    {
      email: String,
      status: { type: String, enum: ["sent", "failed"] },
      error: String,
      sentAt: { type: Date, default: Date.now },
    },
  ],
  sentAt: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model("NewsletterLog", NewsletterLogSchema);
