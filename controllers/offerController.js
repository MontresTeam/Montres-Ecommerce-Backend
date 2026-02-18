const Offer = require("../models/OfferModel");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { sendManualOfferEmail } = require("../services/emailService");

// Generate a unique token
const generateOfferToken = () => {
    return crypto.randomBytes(16).toString("hex");
};

// Create a new offer (Publicly accessible/Customer side or Admin Manual)
const createOffer = async (req, res) => {
    try {
        const {
            product,
            productName,
            customerName,
            customerEmail,
            originalPrice,
            offeredPrice,
            message,
            isManual = true, // Default to true if coming from admin
        } = req.body;

        if (!productName || !customerName || !customerEmail || !offeredPrice || !originalPrice) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        if (isNaN(parseFloat(originalPrice)) || isNaN(parseFloat(offeredPrice))) {
            return res.status(400).json({ message: "Prices must be valid numbers." });
        }

        const token = generateOfferToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

        const offerData = {
            productName,
            customerName,
            customerEmail,
            originalPrice,
            offeredPrice,
            message,
            token,
            expiresAt,
        };

        if (product && mongoose.Types.ObjectId.isValid(product)) {
            offerData.product = product;
        }

        const newOffer = new Offer(offerData);
        const savedOffer = await newOffer.save();

        // Send Email
        const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:3000";
        const offerLink = `${frontendUrl}/offer/${token}`;

        try {
            await sendManualOfferEmail(savedOffer, offerLink);
        } catch (emailError) {
            console.error("Failed to send offer email:", emailError);
            // We still return success for offer creation, but notify about email failure if needed
        }

        res.status(201).json({
            success: true,
            message: "Offer created and link sent to customer",
            data: savedOffer,
            offerLink, // Return link to admin as well
        });
    } catch (error) {
        console.error("Create offer error:", error);
        res.status(500).json({ success: false, message: "Error submitting offer", error: error.message });
    }
};

// Get all offers (Admin Only)
const getOffers = async (req, res) => {
    try {
        const { status, productId } = req.query;
        const filter = {};

        if (status && status !== "all") {
            filter.status = status;
        }

        if (productId) {
            if (mongoose.Types.ObjectId.isValid(productId)) {
                filter.product = productId;
            } else {
                // Fallback or handle invalid ID
            }
        }

        const offers = await Offer.find(filter)
            .populate("product", "brand model name images salePrice regularPrice")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: offers.length,
            data: offers,
        });
    } catch (error) {
        console.error("Get offers error:", error);
        res.status(500).json({ success: false, message: "Error fetching offers", error: error.message });
    }
};

// Update offer status (Admin Only)
const updateOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["pending", "accepted", "rejected", "countered", "expired", "used"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const updatedOffer = await Offer.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        );

        if (!updatedOffer) {
            return res.status(404).json({ message: "Offer not found" });
        }

        res.status(200).json({
            success: true,
            message: `Offer ${status} successfully`,
            data: updatedOffer,
        });
    } catch (error) {
        console.error("Update offer status error:", error);
        res.status(500).json({ success: false, message: "Error updating offer status", error: error.message });
    }
};

// Delete offer (Admin Only)
const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedOffer = await Offer.findByIdAndDelete(id);

        if (!deletedOffer) {
            return res.status(404).json({ message: "Offer not found" });
        }

        res.status(200).json({
            success: true,
            message: "Offer deleted successfully",
        });
    } catch (error) {
        console.error("Delete offer error:", error);
        res.status(500).json({ success: false, message: "Error deleting offer", error: error.message });
    }
};

// Verify offer by token (Public)
const verifyOfferToken = async (req, res) => {
    try {
        const { token } = req.params;
        const offer = await Offer.findOne({ token, status: "pending" }).populate("product");

        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found or already used." });
        }

        if (offer.expiresAt && new Date() > offer.expiresAt) {
            offer.status = "expired";
            await offer.save();
            return res.status(400).json({ success: false, message: "This offer has expired." });
        }

        res.status(200).json({
            success: true,
            data: offer,
        });
    } catch (error) {
        console.error("Verify offer token error:", error);
        res.status(500).json({ success: false, message: "Error verifying offer link", error: error.message });
    }
};

module.exports = {
    createOffer,
    getOffers,
    updateOfferStatus,
    deleteOffer,
    verifyOfferToken,
};
