// controllers/orderController.js
const Order = require("../models/OrderModel");
const Product = require("../models/product");
const userModel = require("../models/UserModel")
const { calculateShippingFee } = require("../utils/shippingCalculator");
const stripePkg = require("stripe");
const axios = require("axios")



const stripe = process.env.STRIPE_SECRET_KEY ? stripePkg(process.env.STRIPE_SECRET_KEY) : null;





const createStripeOrder = async (req, res) => {
  try {
    const { userId } = req.user; // from JWT middleware
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod = "stripe",
      calculateOnly = false, // Add this flag
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Cart items are required" });
    }

    if (!shippingAddress || !shippingAddress.country) {
      return res
        .status(400)
        .json({ message: "Shipping address with country is required" });
    }

    // ✅ Populate product details for each cart item
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

    // ✅ Calculate subtotal
    const subtotal = populatedItems.reduce(
      (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
      0
    );

    // ✅ Calculate shipping fee
    const { shippingFee, region } = calculateShippingFee({
      country: shippingAddress.country,
      subtotal,
    });

    const total = subtotal + shippingFee;

    // ✅ If it's only a calculation request, return the totals without creating order
    if (calculateOnly) {
      return res.status(200).json({
        success: true,
        subtotal,
        shippingFee,
        total,
        vatAmount: 0,
        region,
        items: populatedItems, // Optional: return populated items for verification
      });
    }

    // ✅ Save order (plain JSON-safe data) - Only if not calculateOnly
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

     // ✅ Clear the user's cart in the User model
    await userModel.findByIdAndUpdate(userId, { $set: { cart: [] } });

    // ✅ Stripe Checkout Session with image support
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
        success_url: `http://localhost:3000/paymentsuccess?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,
        cancel_url: `http://localhost:3000/paymentcancel?orderId=${order._id}`,
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

// Tabby sandbox keys
const TABBY_PUBLIC_KEY = "pk_test_0194a887-5d2c-c408-94f4-65ee1ca745e8";
const TABBY_SECRET_KEY = "sk_test_0194a887-5d2c-c408-94f4-65eeeb1ab113";
const TABBY_MERCHANT_CODE = "MTAE";

const createTabbyOrder = async (req, res) => {
  try {
    // Sample test data
 const subtotal = 0.99;
const shippingFee = 30;

// ensure each item >= 1
const itemPrice = subtotal < 1 ? 1 : subtotal;

const total = itemPrice + shippingFee;

const tabbyItems = [
  {
    name: "Test Product",
    quantity: 1,
    price: itemPrice,
    total: itemPrice
  },
  {
    name: "Shipping Fee",
    quantity: 1,
    price: shippingFee,
    total: shippingFee
  }
];


    // Tabby payload
    const tabbyPayload = {
      merchant_code:TABBY_MERCHANT_CODE,
      amount: parseFloat(total.toFixed(2)),
      currency: "AED",
      order_reference: "TESTORDER123",
      items: tabbyItems,
      customer: {
        first_name: "Muhammad Shamin",
        last_name: "Farhan",
        email: "farhan.dev24@gmail.com",
        phone: "+971556384774"
      },
      shipping_address: {
        firstName: "Muhammad Shamin",
        lastName: "Farhan",
        phone: "+971556384774",
        email: "farhan.dev24@gmail.com",
        country: "AE",
        state: "Dubai",
        city: "Business Bay",
        street1: "Office 123",
        postcode: "00000"
      },
      billing_address: {
        firstName: "Muhammad Shamin",
        lastName: "Farhan",
        phone: "+971556384774",
        email: "farhan.dev24@gmail.com",
        country: "AE",
        state: "Dubai",
        city: "Business Bay",
        street1: "Office 123",
        postcode: "00000"
      },
      merchant_urls: {
        success: "http://localhost:3000/paymentsuccess?orderId=TESTORDER123",
        cancel: "http://localhost:3000/paymentcancel?orderId=TESTORDER123",
        failure: "http://localhost:3000/paymentfailure?orderId=TESTORDER123"
      }
    };

    // Call Tabby API
    const response = await axios.post(
      "https://api.tabby.ai/api/v2/checkout",
      tabbyPayload,
      {
        headers: {
          Authorization: `Bearer ${process.env.TABBY_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.status(200).json({
      success: true,
      checkoutUrl: response.data.checkout_url,
      tabbyData: response.data
    });
  } catch (error) {
    console.error("Tabby Test Error:", error.response?.data || error.message);
    return res.status(500).json({
      message: error.response?.data || error.message
    });
  }
};


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
    console.log(userId,"userId")
    if (!userId) return res.status(400).json({ message: "User not provided" });
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    return res.json({ orders });
  } catch (error) {
    console.error("getMyOrders Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};




module.exports = { createStripeOrder, getOrderById, getAllOrders ,getShippingAddresses,createTabbyOrder};
