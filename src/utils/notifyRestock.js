const RestockSubscription = require("../models/RestockSubscription");
const nodemailer = require("nodemailer");
const Product = require("../models/product");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
   tls: {
        rejectUnauthorized: false, // <-- allows self-signed certificates
      },
});

async function notifyRestock(productId) {
  try {
    const product = await Product.findById(productId);
    if (!product) return;

    // 🔐 Only notify when stock > 0
    if (product.stockQuantity <= 0) return;

    const subscriptions = await RestockSubscription.find({
      productId,
      isNotified: false,
    });

    if (!subscriptions.length) return;

    for (const sub of subscriptions) {
      try {
        await transporter.sendMail({
          from: `"Montres Trading L.L.C" <${process.env.EMAIL_USER}>`,
          to: sub.email,
          subject: `🎉 ${product.name} is Back in Stock!`,
          html: `
            <p>Good news!</p>
            <p>
              The product <strong>${product.name}</strong> is back in stock.
            </p>
            <a href="https://www.montres.ae/ProductDetailPage/${product._id}"
               style="padding:10px 15px;background:#000;color:#fff;text-decoration:none;">
              View Product
            </a>
          `,
        });

        // ✅ Mark as notified
        sub.isNotified = true;
        await sub.save();

      } catch (mailError) {
        console.error("Email failed for:", sub.email, mailError);
      }
    }
  } catch (error) {
    console.error("notifyRestock error:", error);
  }
}

module.exports = notifyRestock;
