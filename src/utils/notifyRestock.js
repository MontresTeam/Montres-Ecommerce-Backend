// utils/notifyRestock.js
const RestockSubscription = require("../models/RestockSubscription");
const nodemailer = require("nodemailer");
const Product = require("../models/product")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password, not your Gmail password
  },
  tls: {
    rejectUnauthorized: false, // <-- allows self-signed certificates
  },
});


async function notifyRestock(productId) {
  const product = await Product.findById(productId);
  if (!product) return;

  // Only notify if stockQuantity > 0
  if (product.stockQuantity <= 0) return;

  const subscriptions = await RestockSubscription.find({ productId, isNotified: false });

  for (const sub of subscriptions) {
    await transporter.sendMail({
      from: `"Montres Trading L.L.C" <${process.env.SMTP_USER}>`,
      to: sub.email,
      subject: `Product Back in Stock: ${product.name}`,
      html: `<p>Good news! The product <strong>${product.name}</strong> is back in stock. <a href="https://www.montres.ae/ProductDetailPage/${product._id}">View Product</a></p>`,
    });

    // Mark as notified
    sub.isNotified = true;
    await sub.save();
  }
}

module.exports = notifyRestock;
