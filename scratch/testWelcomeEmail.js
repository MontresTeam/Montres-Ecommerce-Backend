/**
 * Welcome Email Test Script
 * Run: node scratch/testWelcomeEmail.js
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { sendWelcomeEmail } = require("../services/emailService");

const TEST_EMAIL = process.env.ADMIN_EMAIL || "farhan.dev24@gmail.com";
const TEST_NAME  = "Test User";

(async () => {
    console.log("─────────────────────────────────────────");
    console.log("  Montres Welcome Email Test");
    console.log("─────────────────────────────────────────");
    console.log(`  To: ${TEST_EMAIL}`);

    try {
        const result = await sendWelcomeEmail(TEST_EMAIL, TEST_NAME);
        if (result.success) {
            console.log("\n✅ Welcome email delivered successfully!");
            console.log("   Check your inbox at:", TEST_EMAIL);
        }
    } catch (err) {
        console.error("\n❌ Welcome email FAILED:", err.message);
    }
    console.log("─────────────────────────────────────────\n");
    process.exit(0);
})();
