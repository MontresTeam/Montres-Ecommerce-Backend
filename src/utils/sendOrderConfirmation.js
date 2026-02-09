const Order = require("../models/OrderModel");
const User = require("../models/UserModel");
const sendEmail = require("./sendEmail");

const sendOrderConfirmation = async (orderId) => {
    try {
        const order = await Order.findById(orderId).populate("items.productId");
        if (!order) {
            console.error(`❌ Order confirmation failed: Order ${orderId} not found.`);
            return;
        }

        const displayCurrency = order.settlementCurrency || order.currency || "AED";
        const displayTotal = order.settlementTotal || order.total;

        const paymentMethodName = order.paymentMethod ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) : "Unknown";

        // -----------------------------
        // 1. CUSTOMER EMAIL (Receipt)
        // -----------------------------
        const customerEmailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4CAF50;">Payment Successful!</h2>
        <p>Hi ${order.billingAddress?.firstName || "there"},</p>
        <p>Thank you for your purchase via ${paymentMethodName}. Your payment has been successfully verified.</p>
        
        <div style="background: #f9f9f9; padding: 15px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
            <p style="margin: 5px 0;"><strong>Total Paid:</strong> ${displayCurrency} ${displayTotal}</p>
        </div>


        <p>We are now processing your order and will notify you once it ships.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>The Montres Team</strong></p>
      </div>
    `;

        // Send to Customer
        const userEmail = order.billingAddress?.email || order.shippingAddress?.email;
        if (userEmail) {
            await sendEmail(userEmail, "Payment Confirmation - Order #" + order._id, customerEmailHTML);
            console.log(`📧 Customer confirmation sent to ${userEmail}`);
        }

        // -----------------------------
        // 2. ADMIN EMAIL (Notification)
        // -----------------------------
        const adminEmailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #333; border-radius: 8px;">
        <h2 style="color: #2196F3;">💰 Payment Received (${paymentMethodName})</h2>
        <p><strong>Order ID:</strong> ${order._id}</p>
        <p><strong>Customer:</strong> ${order.billingAddress?.firstName} ${order.billingAddress?.lastName}</p>
        <p><strong>Email:</strong> ${userEmail}</p>
        <p><strong>Amount:</strong> ${displayCurrency} ${displayTotal}</p>


        <br/>
        <p>The payment status has been updated to <strong>PAID</strong>.</p>
        <p style="color: red;">Please proceed with fulfillment.</p>
      </div>
    `;

        // Send to Admin & Sales
        if (process.env.ADMIN_EMAIL) {
            await sendEmail(process.env.ADMIN_EMAIL, `💰 Payment Received: Order #${order._id}`, adminEmailHTML);
        }
        if (process.env.SALES_EMAIL) {
            await sendEmail(process.env.SALES_EMAIL, `💰 Payment Received: Order #${order._id}`, adminEmailHTML);
        }
        console.log("📧 Admin notification sent.");

    } catch (error) {
        console.error("Error sending order confirmation:", error);
    }
};

module.exports = sendOrderConfirmation;
