const axios = require("axios");
const Shipment = require("../models/ShipmentModel");
const Order = require("../models/OrderModel");
const { sendShipmentTrackingEmail } = require("../services/emailService");

exports.createDHLShipmentFromOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.orderStatus === "Completed") {
      return res.status(400).json({ success: false, message: "Order is already completed/shipped" });
    }

    const { shippingAddress } = order;

    // DHL Payload matching Phase 1 requirements
    const payload = {
      plannedShippingDateAndTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, ' GMT+00:00'), // Tomorrow
      pickup: { isRequested: false },
      productCode: "P",
      localProductCode: "P",
      getRateEstimates: false,
      accounts: [
        {
          typeCode: "shipper",
          number: process.env.DHL_ACCOUNT_NUMBER || "123456789" // Fallback to provided dummy
        }
      ],
      valueAddedServices: [
        {
          serviceCode: "II",
          value: 10,
          currency: "USD"
        }
      ],
      outputImageProperties: {
        printerDPI: 300,
        encodingFormat: "pdf",
        imageOptions: [
          {
            typeCode: "invoice",
            templateName: "COMMERCIAL_INVOICE_P_10",
            isRequested: true,
            invoiceType: "commercial",
            languageCode: "eng",
            languageCountryCode: "US"
          },
          {
            typeCode: "waybillDoc",
            templateName: "ARCH_8x4",
            isRequested: true,
            hideAccountNumber: false,
            numberOfCopies: 1
          },
          {
            typeCode: "label",
            templateName: "ECOM26_84_001",
            renderDHLLogo: true,
            fitLabelsToA4: false
          }
        ],
        splitTransportAndWaybillDocLabels: true,
        allDocumentsInOneImage: false,
        splitDocumentsByPages: false,
        splitInvoiceAndReceipt: true,
        receiptAndLabelsInOneImage: false
      },
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: process.env.DHL_SHIPPER_POSTAL || "526238",
            cityName: process.env.DHL_SHIPPER_CITY || "Zhaoqing",
            countryCode: process.env.DHL_SHIPPER_COUNTRY_CODE || "CN",
            addressLine1: process.env.DHL_SHIPPER_ADDR1 || "4FENQU, 2HAOKU",
            addressLine2: process.env.DHL_SHIPPER_ADDR2 || "GAOXIN QU",
            addressLine3: process.env.DHL_SHIPPER_ADDR3 || "ZHAOQING, GUANDONG",
            countyName: process.env.DHL_SHIPPER_COUNTY || "SIHUI",
            countryName: process.env.DHL_SHIPPER_COUNTRY || "CHINA, PEOPLES REPUBLIC"
          },
          contactInformation: {
            email: process.env.DHL_SHIPPER_EMAIL || "shipper@montres.ae",
            phone: process.env.DHL_SHIPPER_PHONE || "18211309039",
            mobilePhone: process.env.DHL_SHIPPER_PHONE || "18211309039",
            companyName: process.env.DHL_SHIPPER_COMPANY || "Montres Admin",
            fullName: process.env.DHL_SHIPPER_NAME || "Montres Store"
          },
          typeCode: "business"
        },
        receiverDetails: {
          postalAddress: {
            cityName: shippingAddress.city || "Unknown",
            countryCode: shippingAddress.country || "AE", // Default to AE if missing
            postalCode: shippingAddress.postalCode || "00000",
            addressLine1: shippingAddress.address1 || "No Address Provided",
            ...(shippingAddress.address2 ? { addressLine2: shippingAddress.address2 } : {}),
            countryName: shippingAddress.country === "AE" ? "UNITED ARAB EMIRATES" : shippingAddress.country
          },
          contactInformation: {
            email: shippingAddress.email || "customer@example.com",
            phone: shippingAddress.phone || "0000000000",
            mobilePhone: shippingAddress.phone || "0000000000",
            companyName: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
            fullName: `${shippingAddress.firstName} ${shippingAddress.lastName}`
          },
          typeCode: "business"
        }
      },
      content: {
        packages: order.items.map((item, index) => ({
          typeCode: "2BP",
          weight: 0.5, // Default weight for watch 0.5kg
          dimensions: { length: 10, width: 10, height: 10 },
          customerReferences: [{ value: order._id.toString(), typeCode: "CU" }],
          description: item.name || "Watch",
          labelDescription: `Item ${index + 1}`
        })),
        isCustomsDeclarable: true,
        declaredValue: order.subtotal || 100,
        declaredValueCurrency: order.currency || "AED",
        exportDeclaration: {
          lineItems: order.items.map((item, index) => ({
            number: index + 1,
            description: item.name || "Watch",
            price: item.price || 100,
            quantity: { value: item.quantity || 1, unitOfMeasurement: "PCS" },
            commodityCodes: [
              { typeCode: "outbound", value: "91021100" } // Default HS code for watches
            ],
            exportReasonType: "permanent",
            manufacturerCountry: "CH", // Default Swiss
            weight: { netValue: 0.4, grossValue: 0.5 },
            isTaxesPaid: true
          })),
          invoice: {
            number: order._id.toString(),
            date: new Date().toISOString().split("T")[0],
            instructions: ["Handle with care"],
            totalNetWeight: order.items.length * 0.4,
            totalGrossWeight: order.items.length * 0.5,
            termsOfPayment: "100 days"
          },
          remarks: [{ value: "Right side up only" }],
          destinationPortName: shippingAddress.city || "Destination",
          placeOfIncoterm: "Dubai",
          exportReasonType: "permanent",
          shipmentType: "commercial"
        },
        description: "Order Shipment",
        incoterm: "DAP",
        unitOfMeasurement: "metric"
      },
      shipmentNotification: [
        {
          typeCode: "email",
          receiverId: shippingAddress.email || "customer@example.com",
          languageCode: "eng",
          languageCountryCode: "US",
          bespokeMessage: "Your order from Montres is on the way!"
        }
      ],
      getTransliteratedResponse: false,
      estimatedDeliveryDate: {
        isRequested: true,
        typeCode: "QDDC"
      },
      getAdditionalInformation: [
        { typeCode: "pickupDetails", isRequested: true }
      ]
    };

    // Use test API endpoint unless PROD is specified
    const DHL_API_URL = process.env.DHL_API_URL || "https://express.api.dhl.com/mydhlapi/test/shipments";

    const response = await axios.post(
      DHL_API_URL,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${process.env.DHL_API_KEY}:${process.env.DHL_API_SECRET}`).toString("base64"),
          "Message-Reference": `shipment-${Date.now()}`,
          "Message-Reference-Date": new Date().toISOString()
        }
      }
    );

    const dhlData = response.data;

    // Build package schema for DB
    const dbPackages = order.items.map((item) => ({
      typeCode: "2BP",
      description: item.name || "Watch",
      weight: 0.5,
      quantity: item.quantity || 1,
      unitPrice: item.price || 0,
      totalPrice: (item.price || 0) * (item.quantity || 1),
      hsCode: "91021100",
      originCountry: "CH",
      dimensions: { length: 10, width: 10, height: 10 }
    }));

    // Save Shipment record
    const shipment = await Shipment.create({
      orderId: order._id,
      shipmentType: "manual",
      status: "shipment_created",
      plannedShippingDateAndTime: new Date(),
      currency: order.currency || "AED",
      declaredValue: order.subtotal || 100,
      incoterm: "DAP",
      productCode: "P",
      shipper: {
        address: payload.customerDetails.shipperDetails.postalAddress,
        contact: payload.customerDetails.shipperDetails.contactInformation
      },
      receiver: {
        address: payload.customerDetails.receiverDetails.postalAddress,
        contact: payload.customerDetails.receiverDetails.contactInformation
      },
      packages: dbPackages,
      dhl: {
        shipmentTrackingNumber: dhlData.shipmentTrackingNumber,
        trackingUrl: dhlData.trackingUrl,
        // DHL returns base64 PDFs inside documents[]. Find the label doc.
        labelUrl: null,
        documents: (dhlData.documents || []).map(doc => ({
          typeCode: doc.typeCode,
          content: doc.content,       // base64 encoded PDF
          imageFormat: doc.imageFormat || "PDF"
        })),
        rawResponse: dhlData
      }
    });

    // Update order status & tracking info
    order.orderStatus = "In Transit";
    order.trackingNumber = dhlData.shipmentTrackingNumber;
    order.courierName = "DHL Express";
    order.trackingUrl = dhlData.trackingUrl || `https://www.dhl.com/en/express/tracking.html?AWB=${dhlData.shipmentTrackingNumber}`;
    order.shippedAt = new Date();
    await order.save();

    // Trigger professional shipment tracking email to customer
    try {
      await sendShipmentTrackingEmail(order, {
        trackingNumber: order.trackingNumber,
        courierName: order.courierName,
        trackingUrl: order.trackingUrl,
        status: "In Transit",
      });
      order.emailNotificationSent = true;
      order.lastNotificationSentAt = new Date();
      await order.save();
    } catch (emailErr) {
      console.error("⚠️ Failed to auto-send DHL shipment email:", emailErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "DHL shipment created successfully and tracking email dispatched",
      shipmentTrackingNumber: dhlData.shipmentTrackingNumber,
      data: shipment
    });

  } catch (error) {
    console.error("DHL Shipment Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create DHL shipment",
      error: error.response?.data || error.message
    });
  }
};

// -----------------------------------------------------------
// GET /api/admin/shipments/by-order/:orderId
// Returns the shipment record (tracking number, documents, etc.) for a given order
// -----------------------------------------------------------
exports.getShipmentByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shipment = await Shipment.findOne({ orderId }).lean();

    if (!shipment) {
      return res.status(404).json({ success: false, message: "No shipment found for this order" });
    }

    return res.status(200).json({ success: true, shipment });
  } catch (error) {
    console.error("getShipmentByOrder Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// -----------------------------------------------------------
// GET /api/admin/shipments/label/:orderId
// Streams back the label PDF (base64 decoded) so the browser can download / print it
// -----------------------------------------------------------
exports.downloadShipmentLabel = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shipment = await Shipment.findOne({ orderId }).lean();

    if (!shipment) {
      return res.status(404).json({ success: false, message: "No shipment found for this order" });
    }

    const documents = shipment.dhl?.documents || [];

    // Priority: label > waybillDoc > invoice > first available
    const priority = ["label", "waybillDoc", "invoice"];
    let labelDoc = null;
    for (const type of priority) {
      labelDoc = documents.find(d => d.typeCode === type);
      if (labelDoc) break;
    }
    if (!labelDoc) labelDoc = documents[0];

    if (!labelDoc || !labelDoc.content) {
      return res.status(404).json({
        success: false,
        message: "No label document found in this shipment. DHL may not have returned one."
      });
    }

    const pdfBuffer = Buffer.from(labelDoc.content, "base64");
    const tracking = shipment.dhl?.shipmentTrackingNumber || "label";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="DHL_Label_${tracking}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);

  } catch (error) {
    console.error("downloadShipmentLabel Error:", error.message);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
