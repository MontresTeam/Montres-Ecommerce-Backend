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

// Helper to validate address
const validateAddress = (addr) => {
  if (!addr) return false;
  return (
    addr.firstName &&
    addr.lastName &&
    addr.phone &&
    addr.address1 &&
    addr.city &&
    addr.country
  );
};

const createStripeOrder = async (req, res) => {
  try {
    const { userId } = req.user; // from JWT auth middleware
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
    if (!shippingAddress?.address1 || !shippingAddress?.city)
      return res.status(400).json({ message: "Valid shipping address is required" });

    // ------------------------------
    // 2️⃣ NORMALIZE BILLING ADDRESS
    // ------------------------------
    const finalBillingAddress =
      billingAddress?.address1 && billingAddress?.city ? billingAddress : shippingAddress;

    if (!finalBillingAddress?.address1 || !finalBillingAddress?.city) {
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
    // 7️⃣ SEND EMAIL NOTIFICATIONS (To Admin/Sales)
    // ------------------------------
    // ⚠️ For Stripe, we wait until payment is CONFIRMED via Webhook before sending emails.
    if (paymentMethod !== "stripe") {
      const emailHTML = generateProfessionalOrderEmail({
        order,
        statusTitle: "New Order Received",
        message: `A new order has been placed on the website and is currently <strong>${order.paymentStatus}</strong>.`,
      });

      await sendEmail(process.env.ADMIN_EMAIL, `New Order Notification: ${order._id}`, emailHTML);
      await sendEmail(process.env.SALES_EMAIL, `New Order Notification: ${order._id}`, emailHTML);
    }

    // ------------------------------
    // 8️⃣ CLEAR USER CART
    // ------------------------------
    // ⚠️ For Stripe, we wait until payment is CONFIRMED via Webhook before clearing the cart.
    if (paymentMethod !== "stripe") {
      await userModel.findByIdAndUpdate(userId, { $set: { cart: [] } });
    }

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
        success_url: `http://localhost:3000/paymentsuccess?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,
        cancel_url: `http://localhost:3000/paymentcancel?orderId=${order._id}`,
        metadata: {
          orderId: order._id.toString(),
          userId: userId.toString(),
        },
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



const deleteShippingAddress = async (req, res) => {
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

const updateShippingAddress = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;   // shipping address id
    const updateData = req.body; // fields to update

    const updated = await ShippingAddress.findOneAndUpdate(
      { _id: id, userId },        // ensure address belongs to this user
      { $set: updateData },
      { new: true, runValidators: true } // return updated doc + validate
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found",
      });
    }

    return res.json({
      success: true,
      message: "Shipping address updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update Shipping Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


const updateBillingAddress = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params; // billing address id
    const updateData = req.body; // fields to update

    const updated = await BillingAddress.findOneAndUpdate(
      { _id: id, userId },   // ensure it belongs to the user
      { $set: updateData },
      { new: true, runValidators: true } // return updated doc + validate schema
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Billing address not found",
      });
    }

    return res.json({
      success: true,
      message: "Billing address updated successfully",
      data: updated,
    });

  } catch (err) {
    console.error("Update Billing Address Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



const getBillingAddresses = async (req, res) => {
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


const deleteBillingAddress = async (req, res) => {
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

/**
 * GENERATE PROFESSIONAL EMAIL HTML
 */
const generateProfessionalOrderEmail = ({ order, statusTitle, message }) => {
  const itemsHTML = (order.items || [])
    .map(
      (item) => `
    <tr>
      <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee;">
        <div style="display: flex; align-items: center;">
          <div style="margin-right: 15px;">
            <p style="margin: 0; color: #1a1a1a; font-weight: 600; font-size: 14px;">${item.name}</p>
          </div>
        </div>
      </td>
      <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; text-align: center; color: #666666;">${item.quantity}</td>
      <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #1a1a1a;">AED ${item.price}</td>
    </tr>
  `
    )
    .join("");

  const shipping = order.shippingAddress;
  const shippingString = `
    ${shipping.firstName} ${shipping.lastName}<br>
    ${shipping.address1}${shipping.address2 ? ", " + shipping.address2 : ""}<br>
    ${shipping.city}, ${shipping.state || ""}<br>
    ${shipping.country}
  `;

  return `
    <div style="background-color: #f8f8f8; padding: 40px 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 30px; text-align: center;">
          <h1 style="color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px; font-family: 'Georgia', serif;">MONTRES TRADING</h1>
          <p style="color: #ffffff; margin-top: 10px; font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 3px;">Excellence in Timepieces</p>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #1a1a1a; margin-top: 0; font-size: 22px; font-weight: 700;">${statusTitle}</h2>
          <p style="color: #666666; line-height: 1.6; font-size: 15px;">${message}</p>
          
          <div style="margin: 30px 0; border-top: 1px solid #eeeeee; border-bottom: 1px solid #eeeeee; padding: 20px 0;">
            <div style="display: flex; justify-content: space-between;">
              <p style="margin: 0; font-size: 13px; color: #999999; text-transform: uppercase;">Order ID</p>
              <p style="margin: 0; font-size: 13px; color: #1a1a1a; font-weight: 600;">#${order._id}</p>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 10px;">
              <p style="margin: 0; font-size: 13px; color: #999999; text-transform: uppercase;">Date</p>
              <p style="margin: 0; font-size: 13px; color: #1a1a1a; font-weight: 600;">${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; font-size: 12px; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">Item</th>
                <th style="text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; font-size: 12px; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">Qty</th>
                <th style="text-align: right; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; font-size: 12px; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div style="margin-top: 30px; text-align: right;">
            <p style="margin: 5px 0; color: #666666; font-size: 14px;">Subtotal: AED ${order.subtotal}</p>
            <p style="margin: 5px 0; color: #666666; font-size: 14px;">Shipping: AED ${order.shippingFee}</p>
            <h3 style="margin: 10px 0; color: #1a1a1a; font-size: 20px; font-weight: 700;">Total: AED ${order.total}</h3>
          </div>

          <div style="margin-top: 40px; padding: 25px; background-color: #fcfbf9; border-left: 4px solid #d4af37; border-radius: 4px;">
            <h4 style="margin: 0 0 10px 0; color: #d4af37; text-transform: uppercase; font-size: 11px; letter-spacing: 1.5px; font-weight: 700;">Shipping Destination</h4>
            <p style="margin: 0; color: #1a1a1a; font-size: 14px; line-height: 1.6;">
              ${shippingString}
            </p>
          </div>
          
          <div style="margin-top: 40px; text-align: center;">
            <p style="color: #666666; font-size: 14px;">If you have any questions, please contact us at <a href="mailto:support@montres.ae" style="color: #d4af37; text-decoration: none;">support@montres.ae</a></p>
          </div>
        </div>
        <div style="background-color: #1a1a1a; padding: 30px; text-align: center;">
          <p style="color: #ffffff; font-size: 11px; margin: 0; opacity: 0.5; letter-spacing: 1px; text-transform: uppercase;">&copy; 2026 Montres Trading LLC. Dubai, UAE.</p>
        </div>
      </div>
    </div>
  `;
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
  updateBillingAddress,
  updateShippingAddress
};
