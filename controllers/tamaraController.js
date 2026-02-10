const Order = require("../models/OrderModel");
const Product = require("../models/product");
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
// CREATE TAMARA ORDER
// ==================================================
const createTamaraOrder = async (req, res) => {
    try {
        const userId = req.user.userId; // matches this project's auth
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const {
            items = [],
            shippingAddress,
            billingAddress,
            instalments = 3,
        } = req.body || {};

        // ========================================
        // VALIDATION PHASE (BEFORE DB WRITES)
        // ========================================

        // 1️⃣ Validate UAE phone number (BEFORE creating order)
        if (!shippingAddress?.phone?.startsWith("+971")) {
            return res.status(400).json({
                success: false,
                message: "Invalid UAE phone number for Tamara. Phone must start with +971"
            });
        }

        // 2️⃣ Normalize country code ONCE and reuse
        const countryCode = normalizeCountryCode("AE");

        // Debug: Log country normalization
        console.log("🌍 Country Debug:", {
            received: shippingAddress.country,
            normalized: countryCode
        });

        // 3️⃣ Enforce UAE-only flow (consistency check)
        if (countryCode !== "AE") {
            return res.status(400).json({
                success: false,
                message: "Tamara UAE flow only supports AE country",
                debug: {
                    receivedCountry: shippingAddress.country,
                    normalizedTo: countryCode
                }
            });
        }

        // 4️⃣ Validate instalments
        const ALLOWED_INSTALLMENTS = [3, 4, 6];
        if (!ALLOWED_INSTALLMENTS.includes(instalments)) {
            return res.status(400).json({
                success: false,
                message: `Invalid instalment plan for Tamara UAE. Allowed: ${ALLOWED_INSTALLMENTS.join(", ")}`
            });
        }

        // ========================================
        // PROCESSING PHASE
        // ========================================

        // Determine billing address
        const finalBillingAddress =
            billingAddress?.address1 && billingAddress?.city
                ? billingAddress
                : shippingAddress;

        // Populate items from DB
        const populatedItems = await Promise.all(
            items.map(async (it) => {
                const product = await Product.findById(it.productId)
                    .select("name images salePrice regularPrice stockQuantity published")
                    .lean();

                if (!product) {
                    throw new Error(`Product not found: ${it.productId}`);
                }

                // --- LOGICAL VALIDATIONS (Adapted for Project Fields) ---
                if (!product.published) {
                    throw new Error(`Product "${product.name}" is currently unavailable.`);
                }

                const price = product.salePrice || product.regularPrice || 0;

                return {
                    productId: product._id,
                    name: product.name,
                    image: product.images?.[0]?.url || "",
                    price: price,
                    quantity: it.quantity || 1,
                };
            })
        );

        // Calculate totals
        const subtotal = populatedItems.reduce(
            (acc, item) => acc + item.price * item.quantity,
            0
        );

        // In user's code, they set shippingFee = 0 explicitly for Tamara AE flow
        const { region } = calculateShippingFee({
            country: countryCode,
            subtotal,
        });
        const shippingFee = 0;

        const total = subtotal + shippingFee;

        // Tamara requires AED for AE orders. 
        // We convert USD to AED (Approx 1 USD = 3.6725 AED)
        const RATE = 3.6725;

        // Helper to convert and round to 2 decimals
        const toAED = (amount) => Number((amount * RATE).toFixed(2));

        const tamaraItems = populatedItems.map((item) => ({
            name: item.name,
            type: "Physical",
            reference_id: item.productId.toString(),
            sku: item.productId.toString(),
            quantity: item.quantity,
            unit_price: { amount: toAED(item.price), currency: "AED" },
            total_amount: { amount: toAED(item.price * item.quantity), currency: "AED" },
        }));

        // Recalculate total in AED to match items sum (prevent rounding gaps)
        const tamaraTotal = tamaraItems.reduce((sum, item) => sum + item.total_amount.amount, 0) + toAED(shippingFee);

        // Create order with Multi-Currency support
        const order = await Order.create({
            userId,
            items: populatedItems,
            subtotal,
            shippingFee,
            total,
            vat: 0,
            region,
            currency: "USD",

            // Settlement info (what is actually charged)
            settlementCurrency: "AED",
            settlementTotal: Number(tamaraTotal.toFixed(2)),
            fxRate: RATE,

            shippingAddress,
            billingAddress: finalBillingAddress,
            paymentMethod: "tamara",
            paymentStatus: "pending",
        });

        // Build merchant URLs
        const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
        const backendUrl = process.env.BACKEND_URL || 'https://available-bunny-mousey.ngrok-free.dev';
        const orderId = order._id.toString();

        const merchantUrls = {
            success: `${baseUrl}/checkout/success?orderId=${orderId}&payment=tamara`,
            cancel: `${baseUrl}/checkout/cancel?orderId=${orderId}&payment=tamara`,
            failure: `${baseUrl}/checkout/failure?orderId=${orderId}&payment=tamara`,
            notification: `${backendUrl}/api/webhook/tamara`,
        };

        console.log("🔗 Merchant URLs:", merchantUrls);

        // Tamara payload (Mapping camelCase to snake_case for API)
        const tamaraPayload = {
            order_reference_id: orderId,
            order_number: orderId,
            description: `Order ${orderId} – Montres Ecommerce`,
            total_amount: { amount: Number(tamaraTotal.toFixed(2)), currency: "AED" },
            shipping_amount: { amount: toAED(shippingFee), currency: "AED" },
            tax_amount: { amount: 0, currency: "AED" },
            items: tamaraItems,
            consumer: {
                first_name: shippingAddress.firstName,
                last_name: shippingAddress.lastName,
                email: shippingAddress.email || req.user.email || "",
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
            instalments,
            country_code: countryCode,
            locale: "en_AE",
            is_mobile: false,
            platform: "Montres Ecommerce",
            merchant_url: {
                success: merchantUrls.success,
                cancel: merchantUrls.cancel,
                failure: merchantUrls.failure,
                notification: merchantUrls.notification,
            },
        };

        console.log("📦 Sending Tamara Payload:", JSON.stringify(tamaraPayload, null, 2));

        // Call Tamara API directly using axios
        const tamaraResponse = await axios.post(`${process.env.TAMARA_API_BASE}/checkout`, tamaraPayload, {
            headers: {
                Authorization: `Bearer ${process.env.TAMARA_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
        });

        const checkoutUrl = tamaraResponse.data?._links?.checkout?.href || tamaraResponse.data?.checkout_url;
        if (!checkoutUrl) throw new Error("Tamara checkout URL not returned");

        order.tamaraOrderId = tamaraResponse.data.order_id;
        await order.save();

        // Response
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
