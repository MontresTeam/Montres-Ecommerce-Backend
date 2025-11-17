// controllers/orderController.js
const Order = require("../models/OrderModel");
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
    const { userId } = req.user; // from JWT middleware
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod = "stripe",
      calculateOnly = false,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart items are required" });
    }

    if (!shippingAddress || !shippingAddress.country) {
      return res
        .status(400)
        .json({ message: "Shipping address with country is required" });
    }

    // ✅ Populate product details
    const populatedItems = await Promise.all(
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

    // ✅ Calculate totals
    const subtotal = populatedItems.reduce(
      (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
      0
    );

    const { shippingFee, region } = calculateShippingFee({
      country: shippingAddress.country,
      subtotal,
    });

    const total = subtotal + shippingFee;

    // ✅ Only return totals if calculateOnly is true
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

    // ✅ Save order to DB
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
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
      currency: "AED",
    };

    const order = await Order.create(orderData);


    // ✅ Send Email Notification to Admin
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

    // send to admin
    await sendEmail(
      process.env.ADMIN_EMAIL,
      "🛍️ New Order Notification",
      emailHTML
    );

    // send to sales email
    await sendEmail(
      process.env.SALES_EMAIL, // make sure you define this in .env
      "🛍️ New Order Notification",
      emailHTML
    );

    // ✅ Clear the user's cart

    await userModel.findByIdAndUpdate(userId, { $set: { cart: [] } });

    // ✅ Create Stripe Checkout Session
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
    console.error("CreateOrder Error:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
};

const TABBY_PUBLIC_KEY = "pk_test_0194a887-5d2c-c408-94f4-65ee1ca745e8";
const TABBY_SECRET_KEY = "sk_test_0194a887-5d2c-c408-94f4-65eeeb1ab113";
const TABBY_MERCHANT_CODE = "MTAE";

const createTabbyOrder = async (req, res) => {
  try {
    console.log("✔ Tabby checkout start");

    const subtotal = 0.99;
    const shippingFee = 30;
    const itemPrice = subtotal < 1 ? 1 : subtotal;
    const total = itemPrice + shippingFee;
    console.log(TABBY_MERCHANT_CODE);

    const tabbyPayload = {
      payment: {
        amount: 100,
        currency: "AED",
        description: "Test order",
        buyer: {
          email: "farhan.dev24@gmail.com",
          name: "Muhammad shamin Farhan",
          phone: "971556384774",
        },
        order: {
          reference_id: "ORDER123",
          items: [
            {
              title: "Luxury Watch",
              quantity: 1,
              unit_price: 100,
            },
          ],
        },
      },
      merchant_code: "MTAE",
      lang: "en",
      merchant_urls: {
        success: "https://your-store/success",
        cancel: "https://your-store/cancel",
        failure: "https://your-store/failure",
      },
    };
    console.log("hello reunning");
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
    console.log("hello reunning");

    console.log("✔ Tabby response:", response.data);

   
    const installments =
      response.data?.configuration?.available_products?.installments;

    if (!installments?.length) {
      return res.json({ status: false, message: "No installment options" });
    }

    const paymentUrl = installments[0]?.web_url;
    console.log("➡ Payment URL:", paymentUrl);

    return res.json({ paymentUrl, installments });
  } catch (error) {
    console.error("❌ Tabby Error:", error.response?.data || error.message);

    return res.status(500).json({
      status: false,
      message: error.response?.data || error.message,
    });
  }
}


const getShippingAddresses = async (req, res) => {
  try {
    // Fetch only the shippingAddress field from all orders
    const orders = await Order.find()
      .select("shippingAddress userId total createdAt") // pick fields you need
      .lean(); // return plain JSON objects

    // Optionally, remove duplicates by country + city or full address
    const uniqueAddresses = [];
    const map = new Map();

    orders.forEach((order) => {
      const key = JSON.stringify(order.shippingAddress); // can adjust for country/city
      if (!map.has(key)) {
        map.set(key, true);
        uniqueAddresses.push(order.shippingAddress);
      }
    });

    return res.status(200).json({
      success: true,
      count: uniqueAddresses.length,
      addresses: uniqueAddresses,
    });
  } catch (error) {
    console.error("getShippingAddresses Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

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
  createStripeOrder,
  getOrderById,
  getAllOrders,
  getMyOrders,
  getShippingAddresses,
  createTabbyOrder,
};
