const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, htmlContent, textContent = "") => {
    // The 'to' address should now come directly from environment variables or customer data
    // without hardcoded redirection.

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        // Add error listener to prevent app crashes on unhandled connection errors
        transporter.on('error', (err) => {
            console.error('Nodemailer SendEmail Transporter Error:', err);
        });

        // Strip HTML tags for a clean text version if not provided
        const plainText = textContent || htmlContent.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

        await transporter.sendMail({
            from: `"Montres Trading L.L.C" <${process.env.EMAIL_USER}>`,
            to,
            replyTo: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
            subject,
            text: plainText,
            html: htmlContent,
            headers: {
                "X-Mailer": "Montres-Mailer/2.0",
                "X-Auto-Response-Suppress": "OOF, AutoReply",
            }
        });

        console.log("✅ Email sent successfully to:", to);
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }
};

module.exports = sendEmail;
