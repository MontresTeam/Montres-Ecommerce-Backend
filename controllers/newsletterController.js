const axios = require("axios");
const Newsletter = require("../models/NewsletterModel");

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
