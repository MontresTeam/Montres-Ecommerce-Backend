const Order = require("../models/OrderModel");
const Product = require("../models/product");
const User = require("../models/UserModel");
const { calculateShippingFee } = require("../utils/shippingCalculator");
const axios = require("axios");

const TAMARA_SECRET_KEY = process.env.TAMARA_SECRET_KEY;
const TAMARA_API_BASE = process.env.TAMARA_API_BASE;
const TAMARA_API_URL = `${TAMARA_API_BASE}/checkout`;

// ==================================================
// COUNTRY CODE NORMALIZATION HELPER
// ==================================================
const normalizeCountryCode = (value) => {
    if (!value) return "AE";
    const v = value.toUpperCase();
    if (v === "UAE" || v === "UNITED ARAB EMIRATES") return "AE";
    if (v === "KSA" || v === "SAUDI ARABIA") return "SA";
    return v;
};

// ==================================================
// CREATE TAMARA ORDER (FIXED - AED DIRECT)
// ==================================================
const createTamaraOrder = async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const {
            items = [],
            shippingAddress,
            billingAddress,
            instalments = 3,
        } = req.body || {};

        // ===============================
        // VALIDATION
        // ===============================

        if (!shippingAddress?.phone?.startsWith("+971")) {
            return res.status(400).json({
                success: false,
                message: "Tamara UAE requires phone starting with +971",
            });
        }

        const countryCode = "AE";
        const ALLOWED_INSTALLMENTS = [3, 4, 6];

        if (!ALLOWED_INSTALLMENTS.includes(Number(instalments))) {
            return res.status(400).json({
                success: false,
                message: "Allowed instalments: 3, 4, 6",
            });
        }

        const finalBillingAddress =
            billingAddress?.address1 && billingAddress?.city
                ? billingAddress
                : shippingAddress;

        // ===============================
        // FETCH PRODUCTS
        // ===============================

        const populatedItems = await Promise.all(
            items.map(async (it) => {
                const product = await Product.findById(it.productId)
                    .select("name images salePrice regularPrice stockQuantity published")
                    .lean();

                if (!product) throw new Error("Product not found");
                if (!product.published) throw new Error("Product unavailable");

                const price = product.salePrice || product.regularPrice || 0;

                return {
                    productId: product._id,
                    name: product.name,
                    image: product.images?.[0]?.url || "",
                    price: Number(price),
                    quantity: Number(it.quantity) || 1,
                };
            })
        );

        // ===============================
        // CALCULATIONS (NO FX CONVERSION)
        // ===============================

        const subtotal = populatedItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
        );

        const shippingFee = 0; // If needed, set real value
        const total = subtotal + shippingFee;

        // ===============================
        // TAMARA ITEMS
        // ===============================

        const tamaraItems = populatedItems.map((item) => ({
            name: item.name,
            type: "Physical",
            reference_id: item.productId.toString(),
            sku: item.productId.toString(),
            quantity: item.quantity,
            unit_price: {
                amount: Number(item.price.toFixed(2)),
                currency: "AED",
            },
            total_amount: {
                amount: Number((item.price * item.quantity).toFixed(2)),
                currency: "AED",
            },
        }));

        const tamaraTotal = Number(total.toFixed(2));

        // ===============================
        // CREATE ORDER IN DB
        // ===============================

        const order = await Order.create({
            userId,
            orderId: "", // Will update after or use temporary ID if needed
            items: populatedItems,
            subtotal,
            shippingFee,
            total,
            vat: 0,
            currency: "AED",
            settlementCurrency: "AED",
            fxRate: 1,
            shippingAddress,
            billingAddress: finalBillingAddress,
            paymentMethod: "tamara",
            paymentStatus: "pending",
        });

        const orderId = order._id.toString();
        order.orderId = orderId;
        await order.save();

        const baseUrl =
            process.env.FRONTEND_URL ||
            process.env.CLIENT_URL ||
            "https://www.montres.ae";

        const backendUrl =
            process.env.BACKEND_URL ||
            "https://yourbackend.com";

        const tamaraPayload = {
            order_reference_id: orderId,
            order_number: orderId,
            description: `Order ${orderId} - Montres`,
            total_amount: {
                amount: tamaraTotal,
                currency: "AED",
            },
            shipping_amount: {
                amount: Number(shippingFee.toFixed(2)),
                currency: "AED",
            },
            tax_amount: {
                amount: 0,
                currency: "AED",
            },
            items: tamaraItems,
            consumer: {
                first_name: shippingAddress.firstName,
                last_name: shippingAddress.lastName,
                email: shippingAddress.email || req.user.email,
                phone_number: shippingAddress.phone,
            },
            billing_address: {
                first_name: finalBillingAddress.firstName,
                last_name: finalBillingAddress.lastName,
                line1: finalBillingAddress.address1,
                line2: finalBillingAddress.address2 || "",
                city: finalBillingAddress.city,
                region: finalBillingAddress.region || finalBillingAddress.city,
                country_code: countryCode,
                phone_number: finalBillingAddress.phone,
            },
            shipping_address: {
                first_name: shippingAddress.firstName,
                last_name: shippingAddress.lastName,
                line1: shippingAddress.address1,
                line2: shippingAddress.address2 || "",
                city: shippingAddress.city,
                region: shippingAddress.region || shippingAddress.city,
                country_code: countryCode,
                phone_number: shippingAddress.phone,
            },
            payment_type: "PAY_BY_INSTALMENTS",
            instalments: Number(instalments),
            country_code: countryCode,
            locale: "en_AE",
            merchant_url: {
                success: `${baseUrl}/checkout/verify?orderId=${orderId}&payment=tamara`,
                cancel: `${baseUrl}/checkout/cancel?orderId=${orderId}&payment=tamara`,
                failure: `${baseUrl}/checkout/failure?orderId=${orderId}&payment=tamara`,
                notification: `${backendUrl}/api/webhook/tamara`,
            },
        };

        console.log("Tamara Payload:", tamaraPayload);

        const tamaraResponse = await axios.post(
            `${process.env.TAMARA_API_BASE}/checkout`,
            tamaraPayload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.TAMARA_SECRET_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const checkoutUrl =
            tamaraResponse.data?._links?.checkout?.href ||
            tamaraResponse.data?.checkout_url;

        if (!checkoutUrl) {
            throw new Error("Tamara checkout URL not returned");
        }

        order.tamaraOrderId = tamaraResponse.data.order_id;
        await order.save();

        return res.status(201).json({
            success: true,
            orderId: order._id,
            checkoutUrl,
        });

    } catch (error) {
        console.error("TAMARA ERROR:", error?.response?.data || error.message);

        return res.status(500).json({
            success: false,
            message: "Tamara payment initialization failed",
            error: error?.response?.data || error.message,
        });
    }
};

module.exports = {
    createTamaraOrder,
    normalizeCountryCode
};
