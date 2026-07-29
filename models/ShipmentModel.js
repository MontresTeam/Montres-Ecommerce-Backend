

const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    addressLine1: {
      type: String,
      required: true,
    },

    addressLine2: String,

    addressLine3: String,

    cityName: {
      type: String,
      required: true,
    },

    countyName: String,

    postalCode: {
      type: String,
      required: true,
    },

    countryCode: {
      type: String,
      required: true,
    },

    countryName: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    companyName: String,

    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    mobilePhone: String,
  },
  { _id: false }
);

const packageSchema = new mongoose.Schema(
  {
    typeCode: {
      type: String,
      default: "2BP",
    },

    description: {
      type: String,
      required: true,
    },

    weight: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    unitPrice: {
      type: Number,
      required: true,
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    hsCode: {
      type: String,
      required: true,
    },

    originCountry: {
      type: String,
      required: true,
    },

    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    shipmentType: {
      type: String,
      enum: ["manual", "automatic"],
      default: "manual",
    },

    status: {
      type: String,
      enum: [
        "pending",
        "paid_awaiting_shipment",
        "shipment_created",
        "picked_up",
        "in_transit",
        "delivered",
        "failed",
      ],
      default: "paid_awaiting_shipment",
    },

    plannedShippingDateAndTime: {
      type: Date,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    declaredValue: {
      type: Number,
      required: true,
    },

    incoterm: {
      type: String,
      default: "DAP",
    },

    productCode: {
      type: String,
      default: "P",
    },

    shipper: {
      address: addressSchema,
      contact: contactSchema,
    },

    receiver: {
      address: addressSchema,
      contact: contactSchema,
    },

    packages: [packageSchema],

    dhl: {
      shipmentTrackingNumber: String,

      trackingUrl: String,

      labelUrl: String,

      documents: [],

      rawResponse: Object,
    },

    adminNotes: String,

    errorMessage: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Shipment",
  shipmentSchema
);

