// controllers/orderController.js
const Order = require("../models/OrderModel");
const ShippingAddress = require('../models/ShippingAddress')
const BillingAddress = require('../models/BillingAddress')
const Product = require("../models/product");
const userModel = require("../models/UserModel");
const { calculateShippingFee } = require("../utils/shippingCalculator");
const stripePkg = require("stripe");
const axios = require("axios");
const sendEmail = require("../utils/sendEmail");

const stripe = process.env.STRIPE_SECRET_KEY
  ? stripePkg(process.env.STRIPE_SECRET_KEY)
  : null;

 const createStripeOrder = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod = "stripe",
      calculateOnly = false,
    } = req.body;

    // ------------------------------
    // 1️⃣ VALIDATION
    // ------------------------------
    if (!items?.length) return res.status(400).json({ message: "Cart items are required" });
    if (!shippingAddress?.line1 || !shippingAddress?.city)
      return res.status(400).json({ message: "Valid shipping address is required" });

    // ------------------------------
    // 2️⃣ NORMALIZE BILLING ADDRESS
    // ------------------------------
    const finalBillingAddress =
      billingAddress?.line1 && billingAddress?.city ? billingAddress : shippingAddress;

    if (!finalBillingAddress?.line1 || !finalBillingAddress?.city) {
      return res.status(400).json({ message: "Valid billing address is required" });
    }

    // ------------------------------
    // 3️⃣ POPULATE PRODUCTS
    // ------------------------------
    const populatedItems = await Promise.all(
      items.map(async (it) => {
        const product = await Product.findById(it.productId)
          .select("name images salePrice")
          .lean();
        if (!product) throw new Error(`Product not found: ${it.productId}`);
        return {
          productId: product._id,
          name: product.name,
          image: product.images?.[0]?.url || "",
          price: product.salePrice || 0,
          quantity: it.quantity || 1,
        };
      })
    );

    // ------------------------------
    // 4️⃣ CALCULATE TOTALS
    // ------------------------------
    const subtotal = populatedItems.reduce(
      (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
      0
    );

    const { shippingFee, region } = calculateShippingFee({
      country: shippingAddress.country,
      subtotal,
    });

    const total = subtotal + shippingFee;

    // ------------------------------
    // 5️⃣ CALCULATE ONLY (OPTIONAL)
    // ------------------------------
    if (calculateOnly) {
      return res.status(200).json({
        success: true,
        subtotal,
        shippingFee,
        total,
        vatAmount: 0,
        region,
        items: populatedItems,
      });
    }

    // ------------------------------
    // 6️⃣ CREATE ORDER
    // ------------------------------
    const orderData = {
      userId,
      items: populatedItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      vat: 0,
      shippingFee,
      total,
      region,
      shippingAddress,
      billingAddress: finalBillingAddress,
      paymentMethod,
      paymentStatus: "pending",
      currency: "AED",
    };

    const order = await Order.create(orderData);

    // ------------------------------
    // 7️⃣ SEND EMAIL NOTIFICATIONS
    // ------------------------------
    const productListHTML = populatedItems
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.name}</td>
            <td style="padding:8px;border:1px solid #ddd;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;">AED ${item.price}</td>
          </tr>`
      )
      .join("");

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#d4af37;">🛍️ New Order Received</h2>
        <p><strong>Customer ID:</strong> ${userId}</p>
        <p><strong>Region:</strong> ${region}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Total:</strong> AED ${total}</p>
        <h3>Products:</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ddd;">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd;">Product</th>
              <th style="padding:8px;border:1px solid #ddd;">Qty</th>
              <th style="padding:8px;border:1px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>${productListHTML}</tbody>
        </table>
        <p><strong>Shipping Country:</strong> ${shippingAddress.country}</p>
        <p style="margin-top:20px;">🕒 <em>Order placed on ${new Date().toLocaleString()}</em></p>
      </div>
    `;

    await sendEmail(process.env.ADMIN_EMAIL, "🛍️ New Order Notification", emailHTML);
    await sendEmail(process.env.SALES_EMAIL, "🛍️ New Order Notification", emailHTML);

    // ------------------------------
    // 8️⃣ CLEAR USER CART
    // ------------------------------
    await userModel.findByIdAndUpdate(userId, { $set: { cart: [] } });

    // ------------------------------
    // 9️⃣ CREATE STRIPE CHECKOUT SESSION
    // ------------------------------
    if (paymentMethod === "stripe" && stripe) {
      const lineItems = populatedItems.map((item) => ({
        price_data: {
          currency: "aed",
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity || 1,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        customer_email: finalBillingAddress.email, // links Stripe customer email
        billing_address_collection: "required",   // ensures billing address is collected
        success_url: `https://www.montres.ae/paymentsuccess?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,
        cancel_url: `https://www.montres.ae/paymentcancel?orderId=${order._id}`,
      });

      order.stripeSessionId = session.id;
      await order.save();

      return res.status(201).json({
        success: true,
        order: order.toObject(),
        checkoutUrl: session.url,
      });
    }

    return res.status(201).json({ success: true, order: order.toObject() });
  } catch (error) {
    console.error("Stripe Create Order Error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};




const TABBY_PUBLIC_KEY = "pk_test_0194a887-5d2c-c408-94f4-65ee1ca745e8";
const TABBY_SECRET_KEY = "sk_test_0194a887-5d2c-c408-94f4-65eeeb1ab113";
const TABBY_MERCHANT_CODE = "MTAE";


const createTabbyOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      dummy = false,
    } = req.body || {};

    let populatedItems = [];
    if (!dummy && Array.isArray(items) && items.length > 0) {
      populatedItems = await Promise.all(
        items.map(async (it) => {
          const product = await Product.findById(it.productId)
            .select("name images salePrice")
            .lean();
          if (!product) throw new Error(`Product not found: ${it.productId}`);
          return {
            productId: product._id,
            name: product.name,
            image: product.images?.[0]?.url || product.images?.[0] || "",
            price: product.salePrice || 0,
            quantity: it.quantity || 1,
          };
        })
      );
    } else {
      populatedItems = [
        {
          productId: null,
          name: "Dummy Watch",
          image: "",
          price: 100,
          quantity: 1,
        },
      ];
    }

    const subtotal = populatedItems.reduce(
      (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
      0
    );

    const { shippingFee, region } = calculateShippingFee({
      country: shippingAddress?.country || "AE",
      subtotal,
    });

    const total = subtotal + shippingFee;

    const orderData = {
      userId: req.user?.userId,
      items: populatedItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      vat: 0,
      shippingFee,
      total,
      region,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod: "tabby",
      paymentStatus: "pending",
      currency: "AED",
    };

    const order = await Order.create(orderData);

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const successUrl = `${clientUrl}/tabbyPayment/paymentSuccessful/?orderId=${order._id}`;
    const cancelUrl = `${clientUrl}/tabbyPayment/paymentCancelantion/?orderId=${order._id}`;
    const failureUrl = `${clientUrl}/tabbyPayment/paymentfailure/?orderId=${order._id}`;

    const tabbyItems = populatedItems.map((item) => ({
      title: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const tabbyPayload = {
      payment: {
        amount: Math.max(1, Math.round(total * 100) / 100),
        currency: "AED",
        description: `Order ${order._id}`,
        buyer: {
          email: shippingAddress?.email || "otp.success@tabby.ai",
          name: `${shippingAddress?.firstName || "Test"} ${
            shippingAddress?.lastName || "User"
          }`.trim(),
          phone: shippingAddress?.phone || "+971500000001",
        },
        order: {
          reference_id: order._id.toString(),
          items: tabbyItems,
        },
      },
      merchant_code: TABBY_MERCHANT_CODE,
      lang: "en",
      merchant_urls: {
        success: successUrl,
        cancel: cancelUrl,
        failure: failureUrl,
      },
    };

    const response = await axios.post(
      "https://api.tabby.ai/api/v2/checkout",
      tabbyPayload,
      {
        headers: {
          Authorization: `Bearer ${TABBY_PUBLIC_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const config = response.data?.configuration;

    // Extract installments array properly
    const installments =
      config?.products?.installments?.installments ||
      config?.available_products?.installments ||
      [];

    if (!Array.isArray(installments) || installments.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No installment options" });
    }

    const paymentUrl = installments[0]?.web_url;

    order.tabbySessionId = response.data?.id || null;
    await order.save();

        // ---------------------------------------------
    // 6️⃣ CLEAR CART (Same as Stripe)
    // ---------------------------------------------
    if (req.user?.userId) {
      await userModel.findByIdAndUpdate(req.user.userId, {
        $set: { cart: [] },
      });
    }

    return res.status(201).json({
      success: true,
      order: order.toObject(),
      checkoutUrl: paymentUrl,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: false, message: error.response?.data || error.message });
  }
};




const TAMARA_SECRET_KEY = process.env.TAMARA_SECRET_KEY;
const TAMARA_API_BASE = process.env.TAMARA_API_BASE;
const TAMARA_API_URL = `${TAMARA_API_BASE}/checkout`;

// Helper to validate address
const validateAddress = (addr) => {
  if (!addr) return false;
  return addr.firstName && addr.lastName && addr.phone && addr.address1 && addr.city && addr.country;
};


// ==================================================
// CREATE TAMARA ORDER
// ==================================================
const createTamaraOrder = async (req, res) => {
  try {
    const { userId } = req.user; // from JWT auth middleware
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { items = [], shippingAddress, billingAddress, instalments = 3 } = req.body || {};

    // Validate items
    if (!items.length) return res.status(400).json({ message: "Items are required" });

    // Validate shipping address
    if (!validateAddress(shippingAddress)) {
      return res.status(400).json({ message: "Valid shipping address is required" });
    }

    // Determine billing address
    const finalBillingAddress = validateAddress(billingAddress) ? billingAddress : shippingAddress;

    // Populate items from DB
    const populatedItems = await Promise.all(
      items.map(async (it) => {
        const product = await Product.findById(it.productId).select("name images salePrice").lean();
        if (!product) throw new Error(`Product not found: ${it.productId}`);
        return {
          productId: product._id,
          name: product.name,
          image: product.images?.[0]?.url || "",
          price: product.salePrice,
          quantity: it.quantity || 1,
        };
      })
    );

    // Calculate totals
    const subtotal = populatedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const { shippingFee, region } = calculateShippingFee({
      country: shippingAddress.country || "AE",
      subtotal,
    });
    const total = subtotal + shippingFee;

    // Create order
    const order = await Order.create({
      userId,
      items: populatedItems,
      subtotal,
      shippingFee,
      total,
      vat: 0,
      region,
      currency: "AED",
      shippingAddress,
      billingAddress: finalBillingAddress,
      paymentMethod: "tamara",
      paymentStatus: "pending",
    });

    // Format items for Tamara
    const tamaraItems = populatedItems.map((item) => ({
      name: item.name,
      type: "Physical",
      reference_id: item.productId.toString(),
      sku: item.productId.toString(),
      quantity: item.quantity,
      unit_price: { amount: item.price, currency: "AED" },
      total_amount: { amount: item.price * item.quantity, currency: "AED" },
    }));

    // Tamara payload
    const tamaraPayload = {
      order_reference_id: order._id.toString(),
      order_number: order._id.toString(),
      total_amount: { amount: total, currency: "AED" },
      shipping_amount: { amount: shippingFee, currency: "AED" },
      tax_amount: { amount: 0, currency: "AED" },
      items: tamaraItems,
      consumer: {
        first_name: shippingAddress.firstName,
        last_name: shippingAddress.lastName,
        email: shippingAddress.email || "",
        phone_number: shippingAddress.phone,
      },
      billing_address: {
        first_name: finalBillingAddress.firstName,
        last_name: finalBillingAddress.lastName,
        line1: finalBillingAddress.address1,
        line2: finalBillingAddress.address2 || "",
        city: finalBillingAddress.city,
        country_code: finalBillingAddress.country || "AE",
        phone_number: finalBillingAddress.phone,
      },
      shipping_address: {
        first_name: shippingAddress.firstName,
        last_name: shippingAddress.lastName,
        line1: shippingAddress.address1,
        line2: shippingAddress.address2 || "",
        city: shippingAddress.city,
        country_code: shippingAddress.country || "AE",
        phone_number: shippingAddress.phone,
      },
      payment_type: "PAY_BY_INSTALMENTS",
      instalments,
      country_code: "AE",
      locale: "en_US",
      is_mobile: false,
      platform: "Montres Ecommerce",
      merchant_url: {
        success: `${process.env.TAMARA_MERCHANT_URL_BASE}/paymentsuccess?orderId=${order._id}`,
        cancel: `${process.env.TAMARA_MERCHANT_URL_BASE}/paymentcancel?orderId=${order._id}`,
        failure: `${process.env.TAMARA_MERCHANT_URL_BASE}/paymentfailure?orderId=${order._id}`,
        notification: `${process.env.TAMARA_MERCHANT_URL_BASE}/webhook/tamara`,
      },
    };

    // Call Tamara API
    const tamaraResponse = await axios.post(TAMARA_API_URL, tamaraPayload, {
      headers: {
        Authorization: `Bearer ${TAMARA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const checkoutUrl = tamaraResponse.data?._links?.checkout?.href || tamaraResponse.data?.checkout_url;
    if (!checkoutUrl) throw new Error("Tamara checkout URL not returned");

    order.tamaraSessionId = tamaraResponse.data.order_id;
    await order.save();

    // Send email notifications
    const productListHTML = populatedItems
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.name}</td>
            <td style="padding:8px;border:1px solid #ddd;">${item.quantity}</td>
            <td style="padding:8px;border:1px solid #ddd;">AED ${item.price}</td>
          </tr>`
      )
      .join("");

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color:#d4af37;">🛍️ New Order Received</h2>
        <p><strong>Customer ID:</strong> ${userId}</p>
        <p><strong>Region:</strong> ${region}</p>
        <p><strong>Payment Method:</strong> Tamara</p>
        <p><strong>Total:</strong> AED ${total}</p>
        <h3>Products:</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ddd;">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #ddd;">Product</th>
              <th style="padding:8px;border:1px solid #ddd;">Qty</th>
              <th style="padding:8px;border:1px solid #ddd;">Price</th>
            </tr>
          </thead>
          <tbody>${productListHTML}</tbody>
        </table>
        <p><strong>Shipping Country:</strong> ${shippingAddress.country}</p>
        <p style="margin-top:20px;">🕒 <em>Order placed on ${new Date().toLocaleString()}</em></p>
      </div>
    `;

    await sendEmail(process.env.ADMIN_EMAIL, "🛍️ New Order Notification", emailHTML);
    await sendEmail(process.env.SALES_EMAIL, "🛍️ New Order Notification", emailHTML);

    // Clear user cart
    await userModel.findByIdAndUpdate(userId, { $set: { cart: [] } });

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



const getShippingAddresses = async (req, res) => {
 try {
     const userId = req.user.userId; // 👈 change here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const addresses = await ShippingAddress.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: addresses.length,
      addresses
    });
  } catch (err) {
    console.error("Get Shipping Addresses Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};





// ---------------------
// Create Shipping Address
// ---------------------
const createShippingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const data = req.body;

  

    // Deduplicate per user
    const existing = await ShippingAddress.findOne({
      userId,
      address1: data.address1,
      city: data.city,
      country: data.country,
      phone: data.phone
    });

    if (existing) {
      return res.json({ success: true, address: existing });
    }

    const address = await ShippingAddress.create({
      userId,
      ...data
    });

    return res.status(201).json({ success: true, address });
  } catch (err) {
    console.error("Create Shipping Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



const deleteShippingAddress = async (req,res)=>{
  try {
    const userId = req.user.userId; // 👈 change here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;

    const deleted = await ShippingAddress.findOneAndDelete({
      _id: id,
      userId
    });

    if (!deleted) {
      return res.status(404).json({ message: "Address not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete Shipping Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}


const getBillingAddresses =  async (req,res)=>{
  try {
  const userId = req.user.userId; // 👈 change here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const addresses = await BillingAddress.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: addresses.length,
      addresses
    });
  } catch (err) {
    console.error("Get Billing Addresses Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ---------------------
// Create Billing Address
// ---------------------
const createBillingAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const data = req.body;

    if (!validateAddress(data)) {
      return res.status(400).json({ message: "Invalid billing address" });
    }

    // Deduplicate per user
    const existing = await BillingAddress.findOne({
      userId,
      address1: data.address1,
      city: data.city,
      country: data.country,
      phone: data.phone
    });

    if (existing) {
      return res.json({ success: true, address: existing });
    }

    const address = await BillingAddress.create({
      userId,
      ...data
    });

    return res.status(201).json({ success: true, address });
  } catch (err) {
    console.error("Create Billing Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


const deleteBillingAddress = async (req,res)=>{
  try {
     const userId = req.user.userId; // 👈 change here
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { id } = req.params;

    const deleted = await BillingAddress.findOneAndDelete({
      _id: id,
      userId
    });

    if (!deleted) {
      return res.status(404).json({ message: "Address not found" });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Delete Billing Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
/**
 * Get order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    return res.json({ order });
  } catch (error) {
    console.error("getOrderById Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * List orders for logged-in user
 */
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.json({ orders });
  } catch (error) {
    console.error("getAllOrders Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// get user My orders
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId; // ✅ Correct field
    console.log(userId, "userId");
    if (!userId) return res.status(400).json({ message: "User not provided" });
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    return res.json({ orders });
  } catch (error) {
    console.error("getMyOrders Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getOrderById,
  getAllOrders,
  getMyOrders,
  getShippingAddresses,
  createShippingAddress,
  deleteShippingAddress,
  getBillingAddresses,
  createBillingAddress,
  deleteBillingAddress,
  createTabbyOrder,
  createTamaraOrder,
  createStripeOrder,
};
