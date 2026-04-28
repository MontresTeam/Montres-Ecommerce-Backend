/**
 * Quick Email Test Script
 * Run: node scratch/testEmail.js
 *
 * Tests:
 *   1. Nodemailer SMTP connection
 *   2. Send a real test email to ADMIN_EMAIL
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const nodemailer = require("nodemailer");

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!EMAIL_USER || !EMAIL_PASS) {
    console.error("❌ EMAIL_USER or EMAIL_PASS not set in .env");
    process.exit(1);
}

(async () => {
    console.log("─────────────────────────────────────────");
    console.log("  Montres Email Test");
    console.log("─────────────────────────────────────────");
    console.log(`  Sender : ${EMAIL_USER}`);
    console.log(`  To     : ${ADMIN_EMAIL || EMAIL_USER}`);

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: EMAIL_USER, pass: EMAIL_PASS },
        tls: { rejectUnauthorized: false }
    });

    // ── Step 1: Verify SMTP connection ──────────────────────────
    try {
        await transporter.verify();
        console.log("\n✅ SMTP connection OK — credentials are valid");
    } catch (err) {
        console.error("\n❌ SMTP connection FAILED:", err.message);
        if (err.message.includes("535") || err.message.includes("BadCredentials")) {
            console.error("   → Use a Gmail App Password, NOT your regular password");
            console.error("   → Generate one at: https://myaccount.google.com/apppasswords");
        }
        process.exit(1);
    }

    // ── Step 2: Send a test email ────────────────────────────────
    const recipient = ADMIN_EMAIL || EMAIL_USER;
    try {
        await transporter.sendMail({
            from: `"Montres Test" <${EMAIL_USER}>`,
            to: recipient,
            subject: "✅ Montres Email Test — Nodemailer Working",
            html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px;">
                    <h2 style="color:#0f172a;margin-top:0;">✅ Email System Working</h2>
                    <p style="color:#374151;">This is a test from your Montres backend nodemailer setup.</p>
                    <table style="width:100%;font-size:13px;color:#64748b;margin-top:16px;">
                        <tr><td>Sender</td><td style="text-align:right;color:#0f172a;">${EMAIL_USER}</td></tr>
                        <tr><td>Admin email</td><td style="text-align:right;color:#0f172a;">${ADMIN_EMAIL || "not set"}</td></tr>
                        <tr><td>Time</td><td style="text-align:right;color:#0f172a;">${new Date().toLocaleString()}</td></tr>
                    </table>
                    <p style="margin-top:24px;font-size:12px;color:#94a3b8;">
                        Sent by the Montres backend — <code>scratch/testEmail.js</code>
                    </p>
                </div>`,
            text: `Montres Email Test\nSender: ${EMAIL_USER}\nAdmin: ${ADMIN_EMAIL}\nTime: ${new Date().toLocaleString()}`
        });
        console.log(`✅ Test email sent to: ${recipient}`);
        console.log("\n   → Check your inbox (and spam folder just in case)");
    } catch (err) {
        console.error("❌ Failed to send test email:", err.message);
    }

    console.log("─────────────────────────────────────────\n");
})();
