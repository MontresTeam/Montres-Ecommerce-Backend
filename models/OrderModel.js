const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    name: String,
    price: Number,
    quantity: Number,
    sku: String,
    image: String
  },
  { _id: false }
);

// 🔒 Snapshot schema (DO NOT reference address collections)
const addressSnapshotSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    country: String,
    state: String,
    city: String,
    address1: String,
    address2: String,
    street: String,
    postalCode: String
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true
    },

    orderId: {
      type: String,
      unique: true,
      sparse: true, // Allow nulls if not all orders have this
      index: true
    },

    items: [orderItemSchema],

    subtotal: { type: Number, required: true },
    originalPrice: { type: Number }, // Added for Make Offer system
    vat: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    currency: { type: String, default: "AED" },

    region: {
      type: String,
      enum: ["local", "gcc", "worldwide"],
      default: "local"
    },

    shippingAddress: addressSnapshotSchema,
    billingAddress: addressSnapshotSchema,

    paymentMethod: {
      type: String,
      enum: ["stripe", "tabby", "tamara"],
      required: true
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "authorized", "paid", "failed", "refunded", "closed"],
      default: "pending"
    },

    paidAt: { type: Date },

    delivered_at: { type: Date },

    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String, index: true },
    tabbySessionId: String,
    tabbyCaptureId: String,
    tamaraOrderId: { type: String, index: true },

    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "pending",
        "Paid / Awaiting Shipment",
        "paid_awaiting_shipment",
        "Processing",
        "processing",
        "Shipped",
        "shipped",
        "In Transit",
        "in_transit",
        "Out for Delivery",
        "out_for_delivery",
        "Delivered",
        "delivered",
        "Completed",
        "completed",
        "Cancelled",
        "cancelled",
        "Refunded",
        "refunded",
        "On Hold",
        "on_hold"
      ],
      default: "Pending"
    },

    // Logistics & Tracking
    trackingNumber: { type: String, default: "" },
    courierName: { type: String, default: "" },
    trackingUrl: { type: String, default: "" },
    estimatedDeliveryDate: { type: Date },
    shippedAt: { type: Date },
    deliveryNotes: { type: String, default: "" },
    emailNotificationSent: { type: Boolean, default: false },
    lastNotificationSentAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
