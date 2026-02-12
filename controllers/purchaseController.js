const Purchase = require("../models/Purchase");
const InventoryStock = require("../models/InventoryStockModel");

// Get all purchases
const getPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: purchases.length,
            purchases,
        });
    } catch (error) {
        console.error("Error fetching purchases:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Create a new purchase
const createPurchase = async (req, res) => {
    try {
        const {
            product_name,
            brand,
            category,
            quantity,
            addToInventory,
            purchase_amount,
            shipping_cost,
            total_cost,
            has_shipping,
            shipping_date,
            description,
        } = req.body;

        if (!product_name || purchase_amount === undefined || total_cost === undefined) {
            return res.status(400).json({
                success: false,
                message: "Please provide product name, purchase amount, and total cost",
            });
        }

        const newPurchase = await Purchase.create({
            product_name,
            brand,
            category,
            quantity,
            addToInventory,
            purchase_amount,
            shipping_cost,
            total_cost,
            has_shipping,
            shipping_date,
            description,
        });

        // If addToInventory is true, create InventoryStock item(s)
        if (addToInventory) {
            const inventoryItem = {
                productName: product_name,
                brand: brand || "Other",
                category: category || "Accessories",
                quantity: quantity || 1,
                cost: total_cost, // total cost is cost + shipping
                status: "AVAILABLE",
                description: description,
            };

            // Create new InventoryStock record
            await InventoryStock.create(inventoryItem);
        }

        res.status(201).json({
            success: true,
            message: "Purchase recorded successfully",
            purchase: newPurchase,
        });
    } catch (error) {
        console.error("Error creating purchase:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Update a purchase
const updatePurchase = async (req, res) => {
    try {
        const { id } = req.params;
        let purchase = await Purchase.findById(id);

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found",
            });
        }

        // Only update the Purchase record, NOT the InventoryStock (too complex to sync for now)
        purchase = await Purchase.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            message: "Purchase updated successfully",
            purchase,
        });
    } catch (error) {
        console.error("Error updating purchase:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Delete a purchase
const deletePurchase = async (req, res) => {
    try {
        const { id } = req.params;
        const purchase = await Purchase.findById(id);

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "Purchase not found",
            });
        }

        await Purchase.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Purchase deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting purchase:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

module.exports = {
    getPurchases,
    createPurchase,
    updatePurchase,
    deletePurchase,
};
