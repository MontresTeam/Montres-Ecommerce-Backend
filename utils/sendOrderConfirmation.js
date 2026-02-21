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
        const displayTotal = (order.settlementTotal || order.total || 0).toFixed(2);
        const subtotal = (order.subtotal || 0).toFixed(2);
        const shippingFee = (order.shippingFee || 0).toFixed(2);

        const paymentMethodName = order.paymentMethod ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1) : "Unknown";

        // Generate Items Table Rows
        const itemsHtml = order.items.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name || "Product"}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${displayCurrency} ${(item.price || 0).toFixed(2)}</td>
            </tr>
        `).join("");

        // -----------------------------
        // 1. CUSTOMER EMAIL (Receipt)
        // -----------------------------
        const customerEmailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #4CAF50; text-align: center;">Payment Successful!</h2>
        <p>Hi ${order.billingAddress?.firstName || "there"},</p>
        <p>Thank you for your purchase via <strong>${paymentMethodName}</strong>. Your payment has been successfully verified.</p>
        
        <div style="background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px;">
            <p style="margin: 5px 0;"><strong>Order ID:</strong> ${order._id}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        <h3>Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f2f2f2;">
                    <th style="padding: 10px; text-align: left;">Item</th>
                    <th style="padding: 10px; text-align: center;">Qty</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                    <td style="padding: 10px; text-align: right;">${displayCurrency} ${subtotal}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
                    <td style="padding: 10px; text-align: right;">${displayCurrency} ${shippingFee}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px; text-align: right; color: #4CAF50;"><strong>Total Paid:</strong></td>
                    <td style="padding: 10px; text-align: right; color: #4CAF50;"><strong>${displayCurrency} ${displayTotal}</strong></td>
                </tr>
            </tfoot>
        </table>

        <p>We are now processing your order and will notify you once it ships.</p>
        
        <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 12px; color: #888;">
            <p><strong>The Montres Team</strong></p>
            <p><a href="https://www.montres.ae">www.montres.ae</a></p>
        </div>
      </div>
    `;

        // Send to Customer
        const userEmail = order.billingAddress?.email || order.shippingAddress?.email;
        if (userEmail) {
            const customerText = `Order Confirmation - #${order._id}\n\nHi ${order.billingAddress?.firstName || "there"},\nThank you for your purchase via ${paymentMethodName}. Your payment has been successfully verified.\n\nTotal Paid: ${displayCurrency} ${displayTotal}\n\nWe are now processing your order.`;
            console.log(`📨 Attempting to send customer email to: ${userEmail}`);
            await sendEmail(userEmail, `Order Confirmation - #${order._id}`, customerEmailHTML, customerText);
            console.log(`✅ Customer confirmation sent to ${userEmail}`);
        } else {
            console.warn(`⚠️ No email found for customer in Order: ${order._id}`);
        }

        // -----------------------------
        // 2. ADMIN EMAIL (Notification)
        // -----------------------------
        const adminEmailHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #000; border-bottom: 1px solid #ddd; padding-bottom: 10px;">💰 New Order Received (${paymentMethodName})</h2>
        
        <p><strong>Order Summary:</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 10px 0; background: #f9f9f9; border: 1px solid #eee;">
            <tr><td style="padding: 8px; font-weight: bold;">Order ID:</td><td style="padding: 8px;">${order._id}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Status:</td><td style="padding: 8px;">${order.paymentStatus.toUpperCase()}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Total Amount:</td><td style="padding: 8px;">${displayCurrency} ${displayTotal}</td></tr>
        </table>

        <h3>Customer Details</h3>
        <p>
            <strong>Name:</strong> ${order.billingAddress?.firstName || order.shippingAddress?.firstName || "Customer"} ${order.billingAddress?.lastName || order.shippingAddress?.lastName || ""}<br/>
            <strong>Email:</strong> ${userEmail}<br/>
            <strong>Phone:</strong> ${order.billingAddress?.phone || order.shippingAddress?.phone || "N/A"}<br/>
            <strong>Shipping Address:</strong><br/>
            ${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.postalCode || ""}, ${order.shippingAddress?.country || "UAE"}
        </p>

        <h3>Order Items</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #eee;">
            <tr style="background-color: #f2f2f2;">
                <th style="padding: 10px; text-align: left; border: 1px solid #eee;">Item</th>
                <th style="padding: 10px; text-align: center; border: 1px solid #eee;">Qty</th>
                <th style="padding: 10px; text-align: right; border: 1px solid #eee;">Price</th>
            </tr>
            ${itemsHtml}
        </table>

        <div style="background: #fff3cd; padding: 15px; border-radius: 4px; border: 1px solid #ffeeba; color: #856404;">
            <strong>Action Required:</strong> Please proceed with fulfillment.
        </div>
      </div>
    `;

        const adminText = `New Order Received - #${order._id}\nCustomer: ${order.billingAddress?.firstName || order.shippingAddress?.firstName || "Customer"} ${order.billingAddress?.lastName || order.shippingAddress?.lastName || ""}\nTotal: ${displayCurrency} ${displayTotal}\nStatus: ${order.paymentStatus.toUpperCase()}\n\nPlease proceed with fulfillment.`;

        // Send to Admin & Sales
        if (process.env.ADMIN_EMAIL) {
            console.log(`📨 Attempting to send admin notification to: ${process.env.ADMIN_EMAIL}`);
            await sendEmail(process.env.ADMIN_EMAIL, `💰 New Order #${order._id} - ${displayCurrency} ${displayTotal}`, adminEmailHTML, adminText);
            console.log(`✅ Admin notification sent to ${process.env.ADMIN_EMAIL}`);
        }
        if (process.env.SALES_EMAIL) {
            console.log(`📨 Attempting to send sales notification to: ${process.env.SALES_EMAIL}`);
            await sendEmail(process.env.SALES_EMAIL, `💰 New Order #${order._id}`, adminEmailHTML, adminText);
            console.log(`✅ Sales notification sent to ${process.env.SALES_EMAIL}`);
        }

    } catch (error) {
        console.error("❌ CRITICAL: Error sending order confirmation emails:", error);
    }
};

module.exports = sendOrderConfirmation;
