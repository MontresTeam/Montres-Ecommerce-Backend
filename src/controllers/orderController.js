// controllers/orderController.js
const Order = require("../models/OrderModel");
const Product = require("../models/product");
const userModel = require("../models/UserModel");
const { calculateShippingFee } = require("../utils/shippingCalculator");
const stripePkg = require("stripe");


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



const createTabbyOrder = async (req, res) => {
 
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
