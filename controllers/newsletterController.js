const axios = require("axios");
const Newsletter = require("../models/NewsletterModel");
const User = require("../models/UserModel");
const NewsletterLog = require("../models/NewsletterLog");
const emailService = require("../services/emailService");

/**
 * 📩 Subscribe to Newsletter via Klaviyo & Save locally
 * Endpoint: POST /api/newsletter/subscribe
 */
exports.subscribeToNewsletter = async (req, res) => {
    try {
        const { email, first_name } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        // 1. Save to Local Database (optional but good for backup/sync)
        try {
            const existingSub = await Newsletter.findOne({ email });
            if (!existingSub) {
                await Newsletter.create({
                    email,
                    name: first_name,
                    source: "Website Footer",
                });
            }
        } catch (dbError) {
            console.error("Local Newsletter Save Error:", dbError.message);
            // We don't block the Klaviyo subscription if DB save fails
        }

        // 2. Sync with Klaviyo (V3 API)
        const listId = process.env.KLAVIYO_LIST_ID || "XtTWuN";
        const apiKey = process.env.KLAVIYO_PRIVATE_KEY;

        if (!apiKey) {
            console.error("Klaviyo Private Key is missing in environment variables.");
            return res.status(500).json({
                success: false,
                message: "Server configuration error.",
            });
        }

        // Klaviyo V3 API: Subscribe Profiles
        const response = await axios.post(
            "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/",
            {
                data: {
                    type: "profile-subscription-bulk-create-job",
                    attributes: {
                        custom_source: "Website Newsletter",
                        profiles: {
                            data: [
                                {
                                    type: "profile",
                                    attributes: {
                                        email: email,
                                        subscriptions: {
                                            email: {
                                                marketing: {
                                                    consent: "SUBSCRIBED"
                                                }
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    relationships: {
                        list: {
                            data: {
                                type: "list",
                                id: listId
                            }
                        }
                    }
                }
            },
            {
                headers: {
                    Authorization: `Klaviyo-API-Key ${apiKey}`,
                    Accept: "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json",
                    Revision: "2024-02-15"
                }
            }
        );

        res.status(200).json({
            success: true,
            message: "Successfully subscribed to the newsletter!",
            data: response.data,
        });
    } catch (error) {
        console.error("Klaviyo Subscription Error:", error.response ? JSON.stringify(error.response.data, null, 2) : error.message);

        const errorMessage = error.response && error.response.data && error.response.data.errors && error.response.data.errors[0]
            ? error.response.data.errors[0].detail
            : "Failed to subscribe to the newsletter.";

        res.status(error.response ? error.response.status : 500).json({
            success: false,
            message: errorMessage,
            error: error.response ? error.response.data : error.message,
        });
    }
};

/**
 * 📊 Get all newsletter subscribers
 * Endpoint: GET /api/newsletter
 */
exports.getAllSubscribers = async (req, res) => {
    try {
        const subscribers = await Newsletter.find().sort({ subscribedAt: -1 });
        res.status(200).json({
            success: true,
            count: subscribers.length,
            data: subscribers,
        });
    } catch (error) {
        console.error("Error fetching newsletter subscribers:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch newsletter subscribers.",
        });
    }
};

/**
 * 🗑️ Delete a newsletter subscriber
 * Endpoint: DELETE /api/newsletter/:id
 */
exports.deleteSubscriber = async (req, res) => {
    try {
        const { id } = req.params;
        const subscriber = await Newsletter.findByIdAndDelete(id);

        if (!subscriber) {
            return res.status(404).json({
                success: false,
                message: "Subscriber not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Subscriber removed successfully.",
        });
    } catch (error) {
        console.error("Error deleting newsletter subscriber:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to delete newsletter subscriber.",
        });
    }
};
/**
 * 🚀 Send Newsletter to Audience
 * Endpoint: POST /api/newsletter/send
 */
exports.sendNewsletter = async (req, res) => {
    try {
        const { subject, content, audience } = req.body;

        if (!subject || !content || !audience) {
            return res.status(400).json({
                success: false,
                message: "Subject, content, and audience are required.",
            });
        }

        // 1. Fetch Recipients
        let recipients = [];
        if (audience === "all") {
            // Get all users and all newsletter subscribers, then unique by email
            const users = await User.find({}, "email name");
            const subs = await Newsletter.find({}, "email name");
            
            const combined = [...users, ...subs];
            const uniqueMap = new Map();
            combined.forEach(u => uniqueMap.set(u.email, u.name || "Valued Customer"));
            recipients = Array.from(uniqueMap.entries()).map(([email, name]) => ({ email, name }));
        } else if (audience === "subscribers") {
            // Get newsletter subscribers + users with isSubscribed: true
            const users = await User.find({ isSubscribed: true }, "email name");
            const subs = await Newsletter.find({}, "email name");
            
            const combined = [...users, ...subs];
            const uniqueMap = new Map();
            combined.forEach(u => uniqueMap.set(u.email, u.name || "Valued Customer"));
            recipients = Array.from(uniqueMap.entries()).map(([email, name]) => ({ email, name }));
        }

        if (recipients.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No recipients found for the selected audience.",
            });
        }

        // 2. Create Initial Log
        const newsletterLog = await NewsletterLog.create({
            subject,
            content,
            audience,
            recipientsCount: recipients.length,
            status: "sending",
        });

        // 3. Start Sending Process (Background)
        // We respond to the client immediately to avoid timeouts
        res.status(202).json({
            success: true,
            message: `Newsletter sending started for ${recipients.length} recipients.`,
            logId: newsletterLog._id,
        });

        // Process in background
        const processSending = async () => {
            let sent = 0;
            let failed = 0;
            const logs = [];

            for (const recipient of recipients) {
                try {
                    // Inject name into content if placeholder exists (Bonus)
                    const personalizedContent = content.replace(/{{name}}/g, recipient.name);
                    
                    await emailService.sendNewsletterEmail(recipient.email, subject, personalizedContent);
                    sent++;
                    logs.push({ email: recipient.email, status: "sent" });
                } catch (err) {
                    failed++;
                    logs.push({ email: recipient.email, status: "failed", error: err.message });
                }

                // Update progress every 5 emails or at the end
                if ((sent + failed) % 5 === 0 || (sent + failed) === recipients.length) {
                    await NewsletterLog.findByIdAndUpdate(newsletterLog._id, {
                        sentCount: sent,
                        failedCount: failed,
                        logs: logs
                    });
                }

                // Delay to prevent spam / rate limits (1.5 seconds)
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            // Final Update
            await NewsletterLog.findByIdAndUpdate(newsletterLog._id, {
                status: "completed",
                sentCount: sent,
                failedCount: failed,
                logs: logs,
                sentAt: new Date(),
            });
        };

        processSending();

    } catch (error) {
        console.error("Error sending newsletter:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to initiate newsletter sending.",
        });
    }
};

/**
 * 📊 Get Newsletter Logs
 * Endpoint: GET /api/newsletter/logs
 */
exports.getNewsletterLogs = async (req, res) => {
    try {
        const logs = await NewsletterLog.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: logs,
        });
    } catch (error) {
        console.error("Error fetching newsletter logs:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch newsletter logs.",
        });
    }
};

/**
 * 🧪 Send Test Email
 * Endpoint: POST /api/newsletter/test
 */
exports.sendTestNewsletter = async (req, res) => {
    try {
        const { email, subject, content } = req.body;

        if (!email || !subject || !content) {
            return res.status(400).json({
                success: false,
                message: "Email, subject, and content are required.",
            });
        }

        await emailService.sendNewsletterEmail(email, subject, content);

        res.status(200).json({
            success: true,
            message: "Test email sent successfully!",
        });
    } catch (error) {
        console.error("Error sending test newsletter:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to send test email.",
        });
    }
};
