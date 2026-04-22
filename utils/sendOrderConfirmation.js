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
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                    <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            ${item.image ? `
                            <td style="width: 50px; padding-right: 10px; vertical-align: middle;">
                                <img src="${item.image}" alt="${item.name}" width="50" height="50" style="display: block; border-radius: 4px; border: 1px solid #eee; object-fit: cover;">
                            </td>` : ''}
                            <td style="vertical-align: middle;">
                                <div style="font-weight: bold; color: #333;">${item.name || "Product"}</div>
                                ${item.sku ? `<div style="font-size: 11px; color: #888;">SKU: ${item.sku}</div>` : ''}
                            </td>
                        </tr>
                    </table>
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; vertical-align: middle;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; vertical-align: middle;">${displayCurrency} ${(item.price || 0).toFixed(2)}</td>
            </tr>
        `).join("");

        // -----------------------------
        // 1. CUSTOMER EMAIL (Premium Receipt)
        // -----------------------------
        const customerEmailHTML = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #000000; padding: 40px 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px; text-transform: uppercase;">Payment Confirmed</h1>
            <p style="margin: 10px 0 0; opacity: 0.8; font-size: 16px;">Thank you for your purchase</p>
        </div>

        <div style="padding: 30px;">
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hi ${order.billingAddress?.firstName || "there"},</p>
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">Your payment via <strong>${paymentMethodName}</strong> has been successfully verified. We are now preparing your order for shipment.</p>
            
            <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td style="color: #6b7280; font-size: 14px;">Order ID</td>
                        <td style="text-align: right; font-weight: 600; color: #111827; font-size: 14px;">#${order._id}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; font-size: 14px; padding-top: 8px;">Date</td>
                        <td style="text-align: right; font-weight: 600; color: #111827; font-size: 14px; padding-top: 8px;">${new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                </table>
            </div>

            <h3 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 15px; border-bottom: 1px solid #f3f4f6; padding-bottom: 10px;">Order Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left;">
                        <th style="padding: 12px 0; color: #6b7280; font-size: 12px; text-transform: uppercase;">Item</th>
                        <th style="padding: 12px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; text-align: center;">Qty</th>
                        <th style="padding: 12px 0; color: #6b7280; font-size: 12px; text-transform: uppercase; text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 20px 0 8px; text-align: right; color: #6b7280;">Subtotal</td>
                        <td style="padding: 20px 0 8px; text-align: right; font-weight: 600; color: #111827;">${displayCurrency} ${subtotal}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 8px 0; text-align: right; color: #6b7280;">Shipping</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #111827;">${displayCurrency} ${shippingFee}</td>
                    </tr>
                    <tr>
                        <td colspan="2" style="padding: 15px 0; text-align: right; color: #111827; font-size: 18px; font-weight: 700;">Total Paid</td>
                        <td style="padding: 15px 0; text-align: right; color: #000; font-size: 20px; font-weight: 800; border-top: 2px solid #f3f4f6;">${displayCurrency} ${displayTotal}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 40px; text-align: center; border-bottom: 1px solid #f3f4f6; padding-bottom: 30px;">
                <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">Questions about your order?</p>
                <a href="mailto:support@montres.ae" style="background-color: #000000; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Contact Support</a>
            </div>
            
            <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
                <p style="font-weight: 700; color: #6b7280; margin-bottom: 5px;">THE MONTRES TEAM</p>
                <p><a href="https://www.montres.ae" style="color: #9ca3af; text-decoration: none;">www.montres.ae</a></p>
                <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} Montres. All rights reserved.</p>
            </div>
        </div>
      </div>
    `;

        // Send to Customer
        const userEmail = order.billingAddress?.email || order.shippingAddress?.email;
        if (userEmail) {
            const customerText = `Order Confirmation - #${order._id}\n\nHi ${order.billingAddress?.firstName || "there"},\nThank you for your purchase via ${paymentMethodName}. Your payment has been successfully verified.\n\nTotal Paid: ${displayCurrency} ${displayTotal}\n\nWe are now processing your order.`;
            await sendEmail(userEmail, `Order Confirmation - #${order._id}`, customerEmailHTML, customerText);
        }

        // -----------------------------
        // 2. ADMIN EMAIL (Functional & Professional)
        // -----------------------------
        const adminEmailHTML = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 700px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #1e293b; padding: 25px; color: #ffffff;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td>
                            <h2 style="margin: 0; font-size: 20px; font-weight: 700;">💰 New Order Received</h2>
                            <p style="margin: 5px 0 0; opacity: 0.7; font-size: 14px;">Verification Successful via ${paymentMethodName}</p>
                        </td>
                        <td style="text-align: right;">
                            <div style="background-color: #334155; padding: 8px 15px; border-radius: 6px; display: inline-block;">
                                <span style="font-size: 18px; font-weight: 800;">${displayCurrency} ${displayTotal}</span>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <div style="padding: 25px;">
                <h3 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-top: 0; margin-bottom: 15px;">Order Details</h3>
                <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                            <td style="padding-bottom: 10px; color: #64748b; font-size: 14px;">Order ID:</td>
                            <td style="padding-bottom: 10px; font-weight: 600; color: #0f172a; font-size: 14px; text-align: right;">${order._id}</td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 10px; color: #64748b; font-size: 14px;">Payment Status:</td>
                            <td style="padding-bottom: 10px; font-weight: 700; color: #059669; font-size: 14px; text-align: right;">${order.paymentStatus.toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="color: #64748b; font-size: 14px;">Method:</td>
                            <td style="font-weight: 600; color: #0f172a; font-size: 14px; text-align: right;">${paymentMethodName}</td>
                        </tr>
                    </table>
                </div>

                <h3 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 15px;">Customer & Shipping</h3>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; background-color: #ffffff;">
                    <p style="margin: 0 0 15px; font-size: 15px; line-height: 1.6;">
                        <strong style="color: #0f172a;">${order.billingAddress?.firstName || order.shippingAddress?.firstName || "Customer"} ${order.billingAddress?.lastName || order.shippingAddress?.lastName || ""}</strong><br/>
                        <span style="color: #64748b;">${userEmail}</span><br/>
                        <span style="color: #64748b;">${order.billingAddress?.phone || order.shippingAddress?.phone || "N/A"}</span>
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #334155; padding-top: 15px; border-top: 1px solid #f1f5f9;">
                        <strong style="color: #64748b; text-transform: uppercase; font-size: 11px;">Shipping Address:</strong><br/>
                        ${order.shippingAddress?.street || ""}, ${order.shippingAddress?.city || ""}, ${order.shippingAddress?.postalCode || ""}, ${order.shippingAddress?.country || "UAE"}
                    </p>
                </div>

                <h3 style="font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 15px;">Purchased Items</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 12px 10px; text-align: left; color: #64748b; font-size: 12px;">ITEM</th>
                            <th style="padding: 12px 10px; text-align: center; color: #64748b; font-size: 12px;">QTY</th>
                            <th style="padding: 12px 10px; text-align: right; color: #64748b; font-size: 12px;">PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 20px; color: #92400e;">
                    <h4 style="margin: 0 0 5px; font-size: 14px; font-weight: 700;">Action Required</h4>
                    <p style="margin: 0; font-size: 14px;">This order is ready for fulfillment. Please check the admin dashboard to proceed.</p>
                </div>
            </div>
        </div>
      </div>
    `;

        const adminText = `New Order Received - #${order._id}\nCustomer: ${order.billingAddress?.firstName || order.shippingAddress?.firstName || "Customer"} ${order.billingAddress?.lastName || order.shippingAddress?.lastName || ""}\nTotal: ${displayCurrency} ${displayTotal}\nStatus: ${order.paymentStatus.toUpperCase()}\n\nPlease proceed with fulfillment.`;

        // Send to Admin & Sales
        if (process.env.ADMIN_EMAIL) {
            await sendEmail(process.env.ADMIN_EMAIL, `💰 New Order #${order._id} - ${displayCurrency} ${displayTotal}`, adminEmailHTML, adminText);
        }
        if (process.env.SALES_EMAIL) {
            await sendEmail(process.env.SALES_EMAIL, `💰 New Order #${order._id}`, adminEmailHTML, adminText);
        }

    } catch (error) {
        console.error("❌ CRITICAL: Error sending order confirmation emails:", error);
    }
};

module.exports = sendOrderConfirmation;
