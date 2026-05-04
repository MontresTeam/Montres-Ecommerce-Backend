const Order = require("../models/OrderModel");
require("../models/product"); // ensure Product schema is registered for populate()
const sendEmail = require("./sendEmail");

const sendOrderConfirmation = async (orderId) => {
    try {
        const order = await Order.findById(orderId).populate("items.productId");
        if (!order) {
            console.error(`❌ Order confirmation failed: Order ${orderId} not found.`);
            return;
        }

        // ─── Currency & Totals ─────────────────────────────────────
        const displayCurrency = order.settlementCurrency || order.currency || "AED";
        const displayTotal    = (order.settlementTotal  || order.total    || 0).toFixed(2);
        const subtotal        = (order.subtotal         || 0).toFixed(2);
        const shippingFee     = (order.shippingFee      || 0).toFixed(2);

        const paymentMethodName = order.paymentMethod
            ? order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)
            : "Unknown";

        // ─── Safely resolve customer email ─────────────────────────
        // Tabby orders store email only in shippingAddress; Stripe stores it in billingAddress
        const customerEmail =
            order.billingAddress?.email  ||
            order.shippingAddress?.email ||
            null;

        // ─── Safely resolve customer name ──────────────────────────
        const firstName =
            order.billingAddress?.firstName  ||
            order.shippingAddress?.firstName ||
            "Valued Customer";

        const lastName =
            order.billingAddress?.lastName  ||
            order.shippingAddress?.lastName ||
            "";

        const fullName = `${firstName} ${lastName}`.trim();

        // ─── Customer phone ────────────────────────────────────────
        const phone =
            order.billingAddress?.phone  ||
            order.shippingAddress?.phone ||
            "N/A";

        // ─── Shipping address display ──────────────────────────────
        const shipping = order.shippingAddress || {};
        const shippingLine = [
            shipping.street,
            shipping.city,
            shipping.postalCode,
            shipping.country || "UAE"
        ].filter(Boolean).join(", ");

        // ─── Order date ────────────────────────────────────────────
        const orderDate = order.createdAt
            ? new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit", month: "long", year: "numeric"
              })
            : new Date().toLocaleDateString("en-GB", {
                day: "2-digit", month: "long", year: "numeric"
              });

        // ─── Items HTML (shared between both emails) ───────────────
        // Each item row includes product image, name, SKU, qty and price
        const itemsHtml = (order.items || []).map(item => {
            const imageUrl = item.image || item.productId?.images?.[0]?.url || "";
            const imageCell = imageUrl
                ? `<td style="width:64px;padding:10px 12px 10px 0;vertical-align:middle;">
                       <img src="${imageUrl}" alt="${item.name || 'Product'}" width="56" height="56"
                            style="display:block;border-radius:6px;border:1px solid #e8e8e8;object-fit:cover;">
                   </td>`
                : "";

            return `
            <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                            ${imageCell}
                            <td style="vertical-align:middle;">
                                <div style="font-weight:600;font-size:14px;color:#1a1a1a;">${item.name || "Product"}</div>
                                ${item.sku ? `<div style="font-size:11px;color:#999;margin-top:2px;">SKU: ${item.sku}</div>` : ""}
                            </td>
                            <td style="vertical-align:middle;text-align:center;width:40px;font-size:14px;color:#555;">
                                ${item.quantity || 1}
                            </td>
                            <td style="vertical-align:middle;text-align:right;width:110px;font-size:14px;font-weight:600;color:#1a1a1a;white-space:nowrap;">
                                ${displayCurrency} ${(item.price || 0).toFixed(2)}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>`;
        }).join("");

        // ═══════════════════════════════════════════════════════════
        //  1.  ADMIN EMAIL — "New Order Received"
        // ═══════════════════════════════════════════════════════════
        const adminEmailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New Order Received</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- ── Header ── -->
          <tr>
            <td style="background:#0f172a;padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:20px;font-weight:700;color:#ffffff;">💰 New Order Received</div>
                    <div style="font-size:13px;color:#94a3b8;margin-top:4px;">
                      Payment verified via ${paymentMethodName}
                    </div>
                  </td>
                  <td style="text-align:right;">
                    <div style="background:#1e3a5f;display:inline-block;padding:10px 18px;border-radius:8px;">
                      <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Total</div>
                      <div style="font-size:22px;font-weight:800;color:#ffffff;white-space:nowrap;">
                        ${displayCurrency} ${displayTotal}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:28px 32px;">

              <!-- Order Details -->
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:12px;">
                Order Details
              </div>
              <div style="background:#f8fafc;border-radius:8px;padding:18px 20px;margin-bottom:24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#64748b;font-size:13px;padding-bottom:8px;">Order ID</td>
                    <td style="text-align:right;font-weight:600;color:#0f172a;font-size:13px;padding-bottom:8px;">${order._id}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;padding-bottom:8px;">Order Date</td>
                    <td style="text-align:right;font-weight:600;color:#0f172a;font-size:13px;padding-bottom:8px;">${orderDate}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;padding-bottom:8px;">Payment Status</td>
                    <td style="text-align:right;font-weight:700;color:#059669;font-size:13px;padding-bottom:8px;">
                      ${(order.paymentStatus || "paid").toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-size:13px;">Payment Method</td>
                    <td style="text-align:right;font-weight:600;color:#0f172a;font-size:13px;">${paymentMethodName}</td>
                  </tr>
                </table>
              </div>

              <!-- Customer & Shipping -->
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:12px;">
                Customer &amp; Shipping
              </div>
              <div style="border:1px solid #e2e8f0;border-radius:8px;padding:18px 20px;margin-bottom:24px;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;">${fullName}</div>
                ${customerEmail ? `<div style="font-size:13px;color:#3b82f6;margin-top:4px;">${customerEmail}</div>` : ""}
                <div style="font-size:13px;color:#64748b;margin-top:2px;">${phone}</div>
                <div style="margin-top:14px;padding-top:14px;border-top:1px solid #f1f5f9;">
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:4px;">
                    Shipping Address
                  </div>
                  <div style="font-size:13px;color:#334155;">${shippingLine || "Not provided"}</div>
                </div>
              </div>

              <!-- Purchased Items -->
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;margin-bottom:12px;">
                Purchased Items
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <thead>
                  <tr style="background:#f8fafc;border-radius:6px;">
                    <th style="padding:10px 12px;text-align:left;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                      Item
                    </th>
                    <th style="padding:10px 8px;text-align:center;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:40px;">
                      Qty
                    </th>
                    <th style="padding:10px 0;text-align:right;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:110px;">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td colspan="2" style="padding:8px 0 4px;text-align:right;color:#64748b;font-size:13px;">Subtotal</td>
                  <td style="padding:8px 0 4px;text-align:right;font-weight:600;color:#0f172a;font-size:13px;width:110px;white-space:nowrap;">
                    ${displayCurrency} ${subtotal}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:4px 0;text-align:right;color:#64748b;font-size:13px;">Shipping</td>
                  <td style="padding:4px 0;text-align:right;font-weight:600;color:#0f172a;font-size:13px;white-space:nowrap;">
                    ${displayCurrency} ${shippingFee}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:12px 0 4px;text-align:right;font-size:16px;font-weight:700;color:#0f172a;border-top:2px solid #e2e8f0;">
                    Total Paid
                  </td>
                  <td style="padding:12px 0 4px;text-align:right;font-size:18px;font-weight:800;color:#0f172a;border-top:2px solid #e2e8f0;white-space:nowrap;">
                    ${displayCurrency} ${displayTotal}
                  </td>
                </tr>
              </table>

              <!-- Action Banner -->
              <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px 20px;">
                <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:4px;">⚡ Action Required</div>
                <div style="font-size:13px;color:#92400e;">This order is ready for fulfillment. Please check the admin dashboard to proceed.</div>
              </div>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:20px 32px;background:#f8fafc;text-align:center;border-top:1px solid #e2e8f0;">
              <div style="font-size:11px;color:#94a3b8;">
                Montres Admin Notification &bull; <a href="https://www.montres.ae" style="color:#94a3b8;text-decoration:none;">www.montres.ae</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        // ═══════════════════════════════════════════════════════════
        //  2.  CUSTOMER EMAIL — "Order Confirmation"
        // ═══════════════════════════════════════════════════════════
        const customerEmailHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- ── Header ── -->
          <tr>
            <td style="background:#000000;padding:36px 32px;text-align:center;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:4px;color:#c5a059;margin-bottom:8px;">Montres</div>
              <div style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:1px;">Order Confirmed ✓</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:6px;">Thank you for your purchase</div>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:32px;">

              <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px;">
                Hi <strong>${firstName}</strong>,<br>
                Your payment via <strong>${paymentMethodName}</strong> has been verified successfully.
                We're now preparing your order for shipment.
              </p>

              <!-- Order Info Box -->
              <div style="background:#f9fafb;border-radius:8px;padding:18px 20px;margin-bottom:28px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding-bottom:8px;">Order ID</td>
                    <td style="text-align:right;font-weight:600;color:#111827;font-size:13px;padding-bottom:8px;">#${order._id}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:13px;">Order Date</td>
                    <td style="text-align:right;font-weight:600;color:#111827;font-size:13px;">${orderDate}</td>
                  </tr>
                </table>
              </div>

              <!-- Order Summary -->
              <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f3f4f6;">
                Order Summary
              </div>

              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="padding:8px 0;text-align:left;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Item</th>
                    <th style="padding:8px 0;text-align:center;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:40px;">Qty</th>
                    <th style="padding:8px 0;text-align:right;font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:1px;width:110px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="2" style="padding:12px 0 4px;text-align:right;color:#6b7280;font-size:13px;">Subtotal</td>
                    <td style="padding:12px 0 4px;text-align:right;font-weight:600;color:#111827;font-size:13px;white-space:nowrap;">
                      ${displayCurrency} ${subtotal}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:4px 0;text-align:right;color:#6b7280;font-size:13px;">Shipping</td>
                    <td style="padding:4px 0;text-align:right;font-weight:600;color:#111827;font-size:13px;white-space:nowrap;">
                      ${displayCurrency} ${shippingFee}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:14px 0 6px;text-align:right;font-size:17px;font-weight:700;color:#111827;border-top:2px solid #f3f4f6;">
                      Total Paid
                    </td>
                    <td style="padding:14px 0 6px;text-align:right;font-size:19px;font-weight:800;color:#000000;border-top:2px solid #f3f4f6;white-space:nowrap;">
                      ${displayCurrency} ${displayTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <!-- CTA / Support -->
              <div style="margin-top:36px;padding-top:24px;border-top:1px solid #f3f4f6;text-align:center;">
                <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">
                  Questions about your order?
                </p>
                <a href="mailto:${process.env.ADMIN_EMAIL || "info@montres.ae"}"
                   style="background:#000000;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px;display:inline-block;">
                  Contact Support
                </a>
              </div>

            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:24px;background:#f9fafb;text-align:center;border-top:1px solid #f3f4f6;">
              <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                The Montres Team
              </div>
              <div style="font-size:12px;color:#9ca3af;">
                <a href="https://www.montres.ae" style="color:#9ca3af;text-decoration:none;">www.montres.ae</a>
              </div>
              <div style="font-size:11px;color:#d1d5db;margin-top:10px;">
                &copy; ${new Date().getFullYear()} Montres. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        // ─── Send to Customer ──────────────────────────────────────
        if (customerEmail) {
            const customerText = `Order Confirmation #${order._id}\n\nHi ${firstName},\nYour payment via ${paymentMethodName} has been verified.\nTotal Paid: ${displayCurrency} ${displayTotal}\n\nThank you for shopping with Montres!\n${process.env.ADMIN_EMAIL || ""}`;
            await sendEmail(
                customerEmail,
                `✅ Order Confirmation — #${order._id}`,
                customerEmailHTML,
                customerText
            );
            console.log(`📧 Customer confirmation sent to: ${customerEmail}`);
        } else {
            console.warn(`⚠️ No customer email found for order ${orderId} — skipping customer email`);
        }

        // ─── Send to Admin ─────────────────────────────────────────
        const adminText = `New Order #${order._id}\nCustomer: ${fullName} (${customerEmail || "no email"})\nTotal: ${displayCurrency} ${displayTotal}\nStatus: ${(order.paymentStatus || "paid").toUpperCase()}\n\nPlease proceed with fulfillment in the admin dashboard.`;

        if (process.env.ADMIN_EMAIL) {
            await sendEmail(
                process.env.ADMIN_EMAIL,
                `💰 New Order #${order._id} — ${displayCurrency} ${displayTotal}`,
                adminEmailHTML,
                adminText
            );
            console.log(`📧 Admin notification sent to: ${process.env.ADMIN_EMAIL}`);
        } else {
            console.warn("⚠️ ADMIN_EMAIL not set in .env — skipping admin notification");
        }

        if (process.env.SALES_EMAIL && process.env.SALES_EMAIL !== process.env.ADMIN_EMAIL) {
            await sendEmail(
                process.env.SALES_EMAIL,
                `💰 New Order #${order._id} — ${displayCurrency} ${displayTotal}`,
                adminEmailHTML,
                adminText
            );
            console.log(`📧 Sales notification sent to: ${process.env.SALES_EMAIL}`);
        }

    } catch (error) {
        console.error("❌ CRITICAL: Error in sendOrderConfirmation:", error.message || error);
    }
};

module.exports = sendOrderConfirmation;
