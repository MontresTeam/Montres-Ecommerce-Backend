const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  pool: true, // Use pooling for better connection management
  maxConnections: 5,
  maxMessages: 100,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password, not your Gmail password
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 30000, // 30 seconds
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email Service Error during verification:", error.message);
    if (error.message.includes("535")) {
      console.error("💡 TIP: This is likely a 'Bad Credentials' error. Please ensure you are using a 'Gmail App Password', not your regular Gmail password.");
    }
  } else {
    console.log("✅ Email service is ready to take our messages");
  }
});

// Handle transporter errors to prevent app crashes on connection reset
transporter.on('error', (err) => {
  console.error('Nodemailer Transporter Error:', err);
});

// Welcome email function
const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"Montres Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🎉 Welcome to Montres — Your Account is Ready!",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to Montres</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

          <!-- ── Header ── -->
          <tr>
            <td style="background:#000000;padding:48px 32px;text-align:center;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:5px;color:#c5a059;margin-bottom:12px;">Montres</div>
              <div style="font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">Welcome to the Community</div>
              <div style="width:40px;height:1px;background:#c5a059;margin:20px auto;"></div>
              <div style="font-size:14px;color:rgba(255,255,255,0.6);margin-top:6px;text-transform:uppercase;letter-spacing:2px;">Exclusive Luxury Awaits</div>
            </td>
          </tr>

          <!-- ── Body ── -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 20px;">Hello ${name},</h2>
              <p style="font-size:16px;color:#374151;line-height:1.7;margin:0 0 30px;">
                Thank you for creating an account with <strong>Montres</strong>. 
                We're thrilled to have you join our exclusive community of watch enthusiasts and collectors.
              </p>

              <!-- Benefits -->
              <div style="background:#f9fafb;border-radius:8px;padding:24px;margin-bottom:36px;">
                <div style="font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;margin-bottom:20px;border-bottom:1px solid #e5e7eb;padding-bottom:10px;">
                  What you can do now
                </div>
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:top;padding-bottom:20px;">
                      <div style="width:24px;height:24px;background:#c5a059;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;">✓</div>
                    </td>
                    <td style="padding-left:16px;padding-bottom:20px;">
                      <div style="font-weight:700;font-size:15px;color:#111827;">Browse Premium Watches</div>
                      <div style="font-size:14px;color:#6b7280;margin-top:4px;">Discover our curated collection of luxury and classic timepieces.</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="vertical-align:top;padding-bottom:20px;">
                      <div style="width:24px;height:24px;background:#c5a059;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;">✓</div>
                    </td>
                    <td style="padding-left:16px;padding-bottom:20px;">
                      <div style="font-weight:700;font-size:15px;color:#111827;">Manage Orders Easily</div>
                      <div style="font-size:14px;color:#6b7280;margin-top:4px;">Track shipments and view order history in your personal dashboard.</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="vertical-align:top;">
                      <div style="width:24px;height:24px;background:#c5a059;border-radius:50%;text-align:center;line-height:24px;color:#fff;font-size:12px;">✓</div>
                    </td>
                    <td style="padding-left:16px;">
                      <div style="font-weight:700;font-size:15px;color:#111827;">Exclusive Offers</div>
                      <div style="font-size:14px;color:#6b7280;margin-top:4px;">Be the first to know about new arrivals and private member-only promotions.</div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:40px;">
                <a href="${process.env.CLIENT_URL || 'https://www.montres.ae'}/login"
                   style="background:#000000;color:#ffffff;padding:18px 45px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;display:inline-block;text-transform:uppercase;box-shadow:0 10px 20px rgba(0,0,0,0.1);">
                  Access Your Account
                </a>
              </div>

              <!-- Help -->
              <div style="text-align:center;padding-top:24px;border-top:1px solid #f3f4f6;">
                <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
                  If you did not create this account, please ignore this email.<br>
                  Need assistance? Contact us at <a href="mailto:${process.env.ADMIN_EMAIL || "info@montres.ae"}" style="color:#c5a059;text-decoration:none;font-weight:600;">${process.env.ADMIN_EMAIL || "info@montres.ae"}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="padding:32px;background:#f9fafb;text-align:center;border-top:1px solid #f3f4f6;">
              <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">
                The Montres Store
              </div>
              <div style="font-size:12px;color:#9ca3af;">
                Dubai, United Arab Emirates
              </div>
              <div style="font-size:11px;color:#d1d5db;margin-top:16px;">
                &copy; ${new Date().getFullYear()} Montres. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully to ${email}`);
    return { success: true, message: 'Welcome email sent successfully' };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    throw error;
  }
};

// Manual offer email function
const sendManualOfferEmail = async (offerData, offerLink) => {
  console.log(offerLink, "offerLink");

  const { customerName, customerEmail, productName, offeredPrice, originalPrice, expiresAt } = offerData;
  const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  const mailOptions = {
    from: `"Montres Store" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: `🎁 Exclusive Private Offer: ${productName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Special Offer from Montres</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 10px !important; }
            .header { padding: 30px 15px !important; }
            .content { padding: 30px 20px !important; }
            .price-card { padding: 20px !important; }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f7f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding: 20px 0;">
          <tr>
            <td align="center">
              <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td class="header" style="background-color: #1a1a1a; padding: 50px 40px; text-align: center;">
                    <h1 style="color: #c5a059; margin: 0; font-size: 24px; letter-spacing: 4px; font-weight: 700;">MONTRES</h1>
                    <div style="width: 40px; height: 1px; background-color: #c5a059; margin: 15px auto;"></div>
                    <p style="color: #ffffff; margin: 5px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; opacity: 0.8;">Exclusive Private Invitation</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td class="content" style="padding:50px 40px;">
                    <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 20px;">Hello ${customerName},</h2>
                    <p style="color:#555555;font-size:16px;line-height:1.7;margin:0 0 30px;">
                      We are pleased to offer you a special, time-limited price for the <strong>${productName}</strong>. 
                      This offer has been specially prepared for you and is available only through the link below.
                    </p>
                    
                    <!-- Price Card -->
                    <div class="price-card" style="background-color:#fafafa;border:1px solid #eeeeee;border-radius:12px;padding:35px;text-align:center;margin-bottom:40px;">
                      <div style="color:#888888;font-size:14px;text-decoration:line-through;margin-bottom:8px;">Original Price: AED ${originalPrice.toLocaleString()}</div>
                      <div style="color:#1a1a1a;font-size:18px;margin-bottom:5px;font-weight:500;">Yours for:</div>
                      <div style="color:#c5a059;font-size:42px;font-weight:800;margin-bottom:10px;">AED ${offeredPrice.toLocaleString()}</div>
                      <div style="display:inline-block;padding:6px 15px;background-color:#e6f4ea;color:#1e7e34;border-radius:20px;font-size:13px;font-weight:600;">
                        Save ${(100 - (offeredPrice / originalPrice * 100)).toFixed(0)}% Instantly
                      </div>
                    </div>
                    
                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${offerLink}" style="display:inline-block;background-color:#1a1a1a;color:#ffffff;text-decoration:none;padding:20px 45px;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:1px;box-shadow:0 15px 35px rgba(0,0,0,0.15);">
                            CLAIM THIS OFFER
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Expiry Info -->
                    <div style="text-align:center;margin-top:35px;">
                      <p style="color:#999999;font-size:13px;margin:0;">
                        * This offer is valid until <strong>${expiryDate}</strong>
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Security Note -->
                <tr>
                  <td style="padding:0 40px 40px;">
                    <div style="background-color:#f9f9f9;border-radius:8px;padding:20px;display:flex;align-items:center;">
                      <div style="color:#555555;font-size:13px;line-height:1.5;">
                        <strong>Security Note:</strong> This is a secure personal link and should not be shared. 
                        It will automatically expire after use or on the date specified above.
                      </div>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color:#1a1a1a;padding:40px;text-align:center;color:#888888;">
                    <div style="font-size:18px;color:#ffffff;margin-bottom:10px;font-weight:600;">MONTRES</div>
                    <div style="font-size:12px;margin-bottom:20px;letter-spacing:1px;">LUXURY TIMEPIECES</div>
                    <p style="font-size:13px;margin:0;line-height:1.6;">
                      &copy; ${new Date().getFullYear()} Montres Store. All rights reserved.<br>
                      123 Luxury Lane, Watch District, Geneva, Switzerland
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Manual offer email sent to ${customerEmail}`);
    return { success: true, message: 'Offer email sent successfully' };
  } catch (error) {
    console.error('Error sending offer email:', error);
    throw error;
  }
};

// --- Offer Related Emails ---

const formatCurrency = (amount) => `AED ${amount.toLocaleString()}`;

/**
 * Unified Luxury Wrapper for Customer Emails
 */
const luxuryEmailWrapper = (content, title, accentColor = "#c5a358") => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 40px 20px !important; }
      .cta-btn { width: 100% !important; text-align: center !important; padding: 22px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 60px 0;">
    <tr>
      <td align="center">
        <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #f2f2f2; overflow: hidden;">
          
          <!-- Luxury Header -->
          <tr>
            <td style="padding: 60px 40px 40px; text-align: center;">
              <h1 style="color: #1a1a1a; margin: 0; font-size: 24px; letter-spacing: 5px; font-weight: 300; text-transform: uppercase;">MONTRES</h1>
              <div style="width: 30px; height: 1px; background-color: ${accentColor}; margin: 20px auto;"></div>
              <p style="color: ${accentColor}; margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700;">${title}</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td class="content" style="padding: 0 60px 60px;">
              ${content}
            </td>
          </tr>

          <!-- Minimal Footer -->
          <tr>
            <td style="padding: 0 60px 40px; text-align: center; border-top: 1px solid #f8f8f8; padding-top: 30px;">
              <p style="color: #bbbbbb; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; margin: 0;">
                &copy; ${new Date().getFullYear()} MONTRES LUXURY MARKETPLACE &bull; ALL RIGHTS RESERVED
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// 1. Offer Submitted Confirmation
const sendOfferConfirmationEmail = async (offerData) => {
  const { customerEmail, customerName, productName, offerPrice, originalPrice, token } = offerData;
  const websiteUrl = process.env.CLIENT_URL || "https://www.montres.ae";
  const offerLink = `${websiteUrl}/offer/${token}`;

  const content = `
    <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 500; margin: 0 0 25px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Hello ${customerName},</h2>
    
    <p style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 40px; text-align: center; font-weight: 300;">
      Your offer has been sent to the seller for the <strong>${productName}</strong>. They will review it and respond shortly.
    </p>

    <!-- Pricing Summary -->
    <table width="100%" style="border-top: 1px solid #f8f8f8; border-bottom: 1px solid #f8f8f8; margin-bottom: 40px;">
      <tr>
        <td style="padding: 25px 0; text-align: left;">
          <span style="display: block; color: #999999; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Listed Price</span>
          <span style="color: #333333; font-size: 16px; font-weight: 400;">${formatCurrency(originalPrice)}</span>
        </td>
        <td style="padding: 25px 0; text-align: right;">
          <span style="display: block; color: #c5a358; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Your Offer</span>
          <span style="color: #c5a358; font-size: 16px; font-weight: 600;">${formatCurrency(offerPrice)}</span>
        </td>
      </tr>
    </table>

    <div style="text-align: center; margin-bottom: 20px;">
        <p style="color: #999999; font-size: 11px; margin: 0 0 35px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 300;">
            Seller will respond within 24 hours.
        </p>
        <a href="${offerLink}" class="cta-btn" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 22px 50px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px;">VIEW OFFER STATUS</a>
    </div>
  `;

  const mailOptions = {
    from: `"Montres Store" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: "Your Offer Has Been Submitted",
    html: luxuryEmailWrapper(content, "Offer Submitted Successfully")
  };

  return transporter.sendMail(mailOptions);
};

// 2. Offer Status Update / Transitions (Accepted, Rejected, Countered)
const sendOfferStatusUpdateEmail = async (offerData, status, extra = null) => {
  const { customerEmail, customerName, productName, token, offerPrice, counterPrice, originalPrice } = offerData;
  const websiteUrl = process.env.CLIENT_URL || "https://www.montres.ae";
  const offerLink = `${websiteUrl}/offer/${token}`;

  let title = "Offer Update";
  let accentColor = "#c5a358";
  let content = "";
  let subject = `Offer Update: ${productName}`;

  if (status === 'accepted') {
    accentColor = "#10b981";
    title = "Offer Accepted";
    subject = "Your Offer Has Been Accepted 🎉";
    const finalPrice = counterPrice || offerPrice || extra;

    content = `
      <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 500; margin: 0 0 25px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">GREAT NEWS!</h2>
      
      <p style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 40px; text-align: center; font-weight: 300;">
        Great news! Your offer has been accepted for the <strong>${productName}</strong>.
      </p>

      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 4px; padding: 30px; text-align: center; margin-bottom: 40px;">
          <p style="color: #1a1a1a; font-size: 10px; text-transform: uppercase; letter-spacing: 3px; font-weight: 700; margin-bottom: 10px;">Final Price</p>
          <p style="color: #1a1a1a; font-size: 32px; font-weight: 600; margin: 0;">${formatCurrency(finalPrice)}</p>
      </div>

      <div style="text-align: center;">
          <a href="${offerLink}" class="cta-btn" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 22px 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">SECURE CHECKOUT</a>
      </div>
    `;
  } else if (status === 'rejected') {
    accentColor = "#ef4444";
    title = "Offer Not Accepted";
    subject = "Your Offer Was Not Accepted";

    content = `
      <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 500; margin: 0 0 25px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Hello ${customerName},</h2>
      
      <p style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 30px; text-align: center; font-weight: 300;">
        The seller did not accept your offer for the <strong>${productName}</strong>.
      </p>

      <div style="background-color: #fffafb; border: 1px solid #fee2e2; padding: 25px; text-align: center; margin-bottom: 40px;">
          <p style="color: #ef4444; font-size: 12px; margin: 0; font-weight: 500; letter-spacing: 0.5px;">
            Try a higher offer to increase chances.
          </p>
      </div>

      <div style="text-align: center;">
          <a href="${websiteUrl}/WatchDetailPage/${offerData.product?._id || offerData.product}" class="cta-btn" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 22px 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">MAKE NEW OFFER</a>
      </div>
    `;
  } else if (status === 'countered') {
    title = "Counter Offer Received";
    subject = "Seller Sent You a Counter Offer";
    const cPrice = extra || counterPrice;

    content = `
      <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 500; margin: 0 0 25px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Hello ${customerName},</h2>
      
      <p style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 40px; text-align: center; font-weight: 300;">
        The seller has provided a counter offer for your review.
      </p>

      <table width="100%" style="border-top: 1px solid #f8f8f8; border-bottom: 1px solid #f8f8f8; margin-bottom: 40px;">
        <tr>
          <td style="padding: 25px 0; text-align: left;">
            <span style="display: block; color: #999999; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Your Offer</span>
            <span style="color: #333333; font-size: 16px; font-weight: 400;">${formatCurrency(offerPrice)}</span>
          </td>
          <td style="padding: 25px 0; text-align: right;">
            <span style="display: block; color: #c5a358; font-size: 9px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Seller Counter Offer</span>
            <span style="color: #c5a358; font-size: 20px; font-weight: 700;">${formatCurrency(cPrice)}</span>
          </td>
        </tr>
      </table>

      <div style="text-align: center;">
          <a href="${offerLink}" class="cta-btn" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 22px 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">VIEW OFFER</a>
      </div>
    `;
  }

  const mailOptions = {
    from: `"Montres Store" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: subject,
    html: luxuryEmailWrapper(content, title, accentColor)
  };

  return transporter.sendMail(mailOptions);
};

// 4. Counter Offer received Alert
const sendCounterOfferEmail = async (offerData, counterPrice, expirationHours) => {
  return sendOfferStatusUpdateEmail(offerData, 'countered', counterPrice);
};


// 5. Offer Alerts (To Admin)
const sendAdminOfferNotification = async (offerData) => {
  const { productName, customerName, customerEmail, offerPrice, originalPrice, status, orderId } = offerData;
  const targetEmail = process.env.ADMIN_EMAIL || 'farhan.dev24@gmail.com';
  const adminUrl = process.env.ADMIN_URL || '#';

  let subject = `🚨 New Offer: ${customerName}`;
  let title = "New Offer Received";
  let accentColor = "#1a1a1a";
  let content = "";
  let badgeText = "Pending Review";

  if (status === "COUNTER_OFFER_ACCEPTED") {
    subject = `Customer Accepted Your Counter Offer 🎉`;
    title = "Offer Confirmed";
    badgeText = "COUNTER ACCEPTED";
    accentColor = "#10b981";
    content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Good news! The customer has accepted your counter offer.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; padding: 25px; border-radius: 4px;">
           <p style="color: #15803d; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Final Agreed Price</p>
           <p style="color: #15803d; font-size: 24px; font-weight: 700; margin: 0;">${formatCurrency(offerPrice)}</p>
        </div>
      </div>
      <p style="color: #555; font-size: 13px; text-align: center; margin-bottom: 30px;">You can now proceed with order processing.</p>
      <div style="text-align: center;">
          <a href="${adminUrl}/admin/orders/${orderId || ''}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 18px 35px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; border-radius: 2px;">VIEW ORDER DETAILS</a>
      </div>
    `;
  } else if (status === "COUNTER_OFFER_REJECTED") {
    subject = `Customer Rejected Your Counter Offer`;
    title = "Counter Offer Rejected";
    accentColor = "#ef4444";
    badgeText = "COUNTER REJECTED";
    content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">The customer has declined your counter offer.</p>
        <div style="background-color: #fffafb; border: 1px solid #fee2e2; padding: 25px; border-radius: 4px;">
           <p style="color: #ef4444; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Your Rejected Counter</p>
           <p style="color: #ef4444; font-size: 24px; font-weight: 700; margin: 0;">${formatCurrency(offerPrice)}</p>
        </div>
      </div>
      <p style="color: #555; font-size: 13px; text-align: center; margin-bottom: 30px;">You may send a new counter offer or wait for a new offer.</p>
      <div style="text-align: center;">
          <a href="${adminUrl}/offers" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 18px 35px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; border-radius: 2px;">VIEW OFFER</a>
      </div>
    `;
  } else {
    // Default: New Offer Submitted
    const discount = (((originalPrice - offerPrice) / originalPrice) * 100).toFixed(0);
    content = `
      <div style="margin-bottom: 30px;">
        <table width="100%" style="border-collapse: collapse; margin-bottom: 30px;">
          <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Product</td>
            <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9; color: #1a1a1a; font-weight: 600; text-align: right;">${productName}</td>
          </tr>
          <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Customer</td>
            <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9; color: #1a1a1a; text-align: right;">${customerName} (${customerEmail})</td>
          </tr>
          <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Bid Amount</td>
            <td style="padding: 15px 0; border-bottom: 1px solid #f1f5f9; color: #1a1a1a; font-weight: 700; font-size: 18px; text-align: right;">${formatCurrency(offerPrice)}</td>
          </tr>
          <tr>
            <td style="padding: 15px 0; color: #64748b; font-size: 13px;">Discount</td>
            <td style="padding: 15px 0; color: #ef4444; font-weight: 700; text-align: right;">-${discount}% off List</td>
          </tr>
        </table>
        <div style="text-align: center;">
            <a href="${adminUrl}/offers" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 18px 35px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; border-radius: 2px;">MANAGE IN DASHBOARD</a>
        </div>
      </div>
    `;
  }

  const html = luxuryEmailWrapper(title, content, accentColor, badgeText);

  const mailOptions = {
    from: `"Montres Boutique" <${process.env.EMAIL_USER}>`,
    to: targetEmail,
    subject: subject,
    html: html
  };

  return transporter.sendMail(mailOptions);
};


// 6. Order Confirmation (To Customer)
const sendOrderConfirmationEmail = async (order) => {
  const { shippingAddress, items, total, subtotal, shippingFee, currency, _id } = order;

  const itemsHTML = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <div style="display: flex; align-items: center;">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px;">
          <div>
            <p style="margin: 0; font-weight: 600; color: #333;">${item.name}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">Qty: ${item.quantity}</p>
          </div>
        </div>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: #333;">
        ${currency} ${(item.price * item.quantity).toLocaleString()}
      </td>
    </tr>
  `).join('');

  const mailOptions = {
    from: `"Montres Store" <${process.env.EMAIL_USER}>`,
    to: shippingAddress.email,
    subject: `✅ Order Confirmed: #${_id.toString().slice(-6).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 40px 0;">
          <tr>
            <td align="center">
              <table class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <tr>
                  <td style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 40px; text-align: center;">
                    <h1 style="color: #d4af37; margin: 0; font-size: 28px; letter-spacing: 2px;">MONTRES</h1>
                    <p style="color: #ffffff; margin: 10px 0 0; font-size: 14px; opacity: 0.8; text-transform: uppercase; letter-spacing: 3px;">Order Confirmation</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #333; margin: 0 0 20px;">Thank you for your order!</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                      Hi ${shippingAddress.firstName}, we've received your order and are getting it ready for shipment. 
                      You'll receive another email with tracking information once your package is on its way.
                    </p>
                    
                    <div style="margin: 30px 0; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #fafafa;">
                      <p style="margin: 0 0 10px; font-size: 13px; color: #999; text-transform: uppercase;">Order Number</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #333;">#${_id.toString().toUpperCase()}</p>
                    </div>

                    <h3 style="color: #333; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px; margin-top: 40px;">Order Summary</h3>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${itemsHTML}
                      <tr>
                        <td style="padding: 20px 12px 5px; text-align: right; color: #666;">Subtotal</td>
                        <td style="padding: 20px 12px 5px; text-align: right; color: #333;">${currency} ${subtotal.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 12px; text-align: right; color: #666;">Shipping</td>
                        <td style="padding: 5px 12px; text-align: right; color: #333;">${currency} ${shippingFee.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: 700; color: #333;">Total</td>
                        <td style="padding: 15px 12px; text-align: right; font-size: 18px; font-weight: 700; color: #d4af37;">${currency} ${total.toLocaleString()}</td>
                      </tr>
                    </table>

                    <h3 style="color: #333; border-bottom: 2px solid #f4f4f4; padding-bottom: 10px; margin-top: 40px;">Shipping Address</h3>
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 15px 0 0;">
                      ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
                      ${shippingAddress.address1}${shippingAddress.address2 ? ', ' + shippingAddress.address2 : ''}<br>
                      ${shippingAddress.city}, ${shippingAddress.country}<br>
                      Phone: ${shippingAddress.phone}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eee;">
                    <p style="color: #888; font-size: 14px; margin: 0;">Questions? Contact us at ${process.env.ADMIN_EMAIL || "info@montres.ae"}</p>
                  </td>
                </tr>
              </table>
              <p style="color: #aaa; font-size: 12px; margin-top: 20px;">
                &copy; ${new Date().getFullYear()} Montres Store. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
};

// 7. Restock Notification (To Customer)
const sendRestockNotification = async (email, productName, productUrl, productThumbnail) => {
  const mailOptions = {
    from: `"Montres Store" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `✨ Back in Stock: ${productName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <div style="display: inline-block; padding: 10px 20px; background-color: #f0fdf4; color: #16a34a; border-radius: 30px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px;">
                      It's Back!
                    </div>
                    <h1 style="color: #1a1a1a; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Back in Stock</h1>
                    <p style="color: #64748b; font-size: 18px; line-height: 1.6; margin: 15px 0 40px;">
                      Good news! The <strong>${productName}</strong> you were looking for is now available again. 
                      Act fast, as stock is limited!
                    </p>
                    
                    ${productThumbnail ? `
                      <div style="margin-bottom: 40px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <img src="${productThumbnail}" alt="${productName}" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px;">
                      </div>
                    ` : ''}

                    <a href="${productUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 20px 45px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 20px rgba(0,0,0,0.1);">
                      SHOP NOW
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #1a1a1a; padding: 40px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 10px;">You're receiving this because you signed up for restock alerts.</p>
                    <p style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 2px;">MONTRES</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  return transporter.sendMail(mailOptions);
};

// 8. Offer Expired (To Customer)
const sendOfferExpiredEmail = async (offerData) => {
  const { customerEmail, customerName, productName } = offerData;
  const websiteUrl = process.env.CLIENT_URL || "https://www.montres.ae";

  const content = `
    <h2 style="color: #1a1a1a; font-size: 18px; font-weight: 500; margin: 0 0 25px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Hello ${customerName},</h2>
    
    <p style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0 0 40px; text-align: center; font-weight: 300;">
      Your offer has expired without response for the <strong>${productName}</strong>.
    </p>

    <div style="text-align: center;">
        <a href="${websiteUrl}/WatchDetailPage/${offerData.product?._id || offerData.product}" class="cta-btn" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 22px 50px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">SUBMIT NEW OFFER</a>
    </div>
  `;

  const mailOptions = {
    from: `"Montres Store" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    subject: "Your Offer Has Expired",
    html: luxuryEmailWrapper(content, "Offer Expired", "#94a3b8")
  };

  return transporter.sendMail(mailOptions);
};

/**
 * 📧 Generic Newsletter & Marketing Email Sender
 */
const sendNewsletterEmail = async (email, subject, htmlContent) => {
  const mailOptions = {
    from: `"Montres Boutique" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: htmlContent,
  };

  try {
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error(`❌ Error sending newsletter to ${email}:`, error.message);
    throw error;
  }
};

/**
 * ✨ Professional Email Templates
 */
const getWelcomeTemplate = (name) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; }
    .hero { background-color: #1a1a1a; color: #ffffff; padding: 80px 40px; text-align: center; }
    .content { padding: 60px 40px; text-align: center; color: #1a1a1a; }
    .btn { display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 20px 45px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin-top: 30px; }
    .footer { padding: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1 style="letter-spacing: 10px; text-transform: uppercase; font-weight: 300; margin-bottom: 20px;">MONTRES</h1>
      <p style="font-size: 18px; font-weight: 300; color: #c5a358; letter-spacing: 2px;">WELCOME TO THE INNER CIRCLE</p>
    </div>
    <div class="content">
      <h2 style="font-size: 24px; margin-bottom: 20px;">Hello ${name || 'Valued Member'},</h2>
      <p style="line-height: 1.8; font-size: 16px;">We are delighted to welcome you to Montres, where luxury meets time. You now have exclusive access to our curated collection of world-class timepieces and private member offers.</p>
      <a href="https://www.montres.ae/shop" class="btn">SHOP THE COLLECTION</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MONTRES LUXURY MARKETPLACE</p>
      <p>Dubai, United Arab Emirates</p>
      <div style="margin-top: 20px;">
        <a href="#" style="color: #888; text-decoration: none; margin: 0 10px;">Instagram</a>
        <a href="#" style="color: #888; text-decoration: none; margin: 0 10px;">Facebook</a>
        <a href="#" style="color: #888; text-decoration: none; margin: 0 10px;">Twitter</a>
      </div>
      <p style="margin-top: 20px; font-size: 10px;">If you wish to stop receiving these emails, you can <a href="#" style="color: #1a1a1a;">unsubscribe here</a>.</p>
    </div>
  </div>
</body>
</html>
`;

const getDiscountTemplate = (discountCode = "WELCOME10", percentage = "10") => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8f8f8; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; }
    .hero { padding: 60px 40px; text-align: center; }
    .discount-box { background-color: #1a1a1a; color: #ffffff; padding: 40px; margin: 30px 0; border-radius: 8px; }
    .btn { display: inline-block; background-color: #c5a358; color: #ffffff; padding: 20px 45px; text-decoration: none; font-weight: 700; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; }
    .footer { padding: 40px; text-align: center; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1 style="letter-spacing: 5px; text-transform: uppercase; font-size: 20px;">MONTRES</h1>
      <div style="width: 30px; height: 1px; background-color: #c5a358; margin: 20px auto;"></div>
      <h2 style="font-size: 32px; margin-bottom: 10px;">EXCLUSIVE OFFER</h2>
      <p style="color: #666;">A special gift for our most dedicated collectors.</p>
      
      <div class="discount-box">
        <p style="font-size: 14px; letter-spacing: 3px; margin-bottom: 10px;">YOUR PRIVATE CODE</p>
        <h3 style="font-size: 48px; margin: 0; letter-spacing: 5px; color: #c5a358;">${percentage}% OFF</h3>
        <p style="font-size: 24px; font-weight: 700; margin-top: 20px; border: 1px dashed #c5a358; display: inline-block; padding: 10px 30px;">${discountCode}</p>
      </div>
      
      <p style="margin-bottom: 30px; color: #ff4d4d; font-weight: 700; font-size: 13px;">LIMITED TIME ONLY — EXPIRES IN 48 HOURS</p>
      <a href="https://www.montres.ae/shop" class="btn">REDEEM MY OFFER</a>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MONTRES LUXURY MARKETPLACE</p>
      <p>Terms and conditions apply. Offer valid on select items only.</p>
      <p><a href="#" style="color: #999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`;

const getNewArrivalTemplate = (products = []) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { padding: 40px; text-align: center; border-bottom: 1px solid #f0f0f0; }
    .product-grid { padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .product-card { text-align: center; margin-bottom: 40px; }
    .product-img { width: 100%; aspect-ratio: 1; background-color: #f9f9f9; border-radius: 4px; object-fit: cover; }
    .btn { display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: 700; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin-top: 15px; }
    .footer { padding: 40px; text-align: center; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="letter-spacing: 8px; text-transform: uppercase; font-size: 22px;">MONTRES</h1>
      <p style="font-size: 12px; letter-spacing: 3px; color: #c5a358; margin-top: 10px;">JUST ARRIVED</p>
    </div>
    
    <div style="padding: 60px 40px; text-align: center;">
      <h2 style="font-size: 28px; margin-bottom: 15px;">THE NEW SEASON</h2>
      <p style="color: #666; line-height: 1.6;">Discover the latest additions to our luxury collection. Exceptional craftsmanship meets timeless design.</p>
    </div>

    <!-- Product Showcase (Simulated Grid) -->
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 0 40px;">
      <tr>
        <td width="50%" style="padding: 10px;">
          <div class="product-card">
            <img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&h=400" class="product-img" alt="Watch 1">
            <h3 style="font-size: 14px; margin-top: 15px; text-transform: uppercase;">Rolex Submariner</h3>
            <p style="font-size: 12px; color: #c5a358; font-weight: 700;">AED 45,000</p>
            <a href="#" class="btn">VIEW DETAILS</a>
          </div>
        </td>
        <td width="50%" style="padding: 10px;">
          <div class="product-card">
            <img src="https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=400&h=400" class="product-img" alt="Watch 2">
            <h3 style="font-size: 14px; margin-top: 15px; text-transform: uppercase;">Patek Philippe</h3>
            <p style="font-size: 12px; color: #c5a358; font-weight: 700;">AED 120,000</p>
            <a href="#" class="btn">VIEW DETAILS</a>
          </div>
        </td>
      </tr>
    </table>

    <div style="text-align: center; padding: 40px;">
      <a href="https://www.montres.ae/new-arrivals" style="text-decoration: underline; color: #1a1a1a; font-weight: 700; letter-spacing: 1px;">BROWSE ALL NEW ARRIVALS</a>
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MONTRES LUXURY MARKETPLACE</p>
      <p>Dubai, UAE &bull; Global Shipping Available</p>
      <p><a href="#" style="color: #999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`;

/**
 * 📦 Shipment & Tracking Notification Email (To Customer)
 */
const sendShipmentTrackingEmail = async (order, options = {}) => {
  const {
    trackingNumber = order.trackingNumber || "",
    courierName = order.courierName || "DHL Express",
    trackingUrl: customTrackingUrl = order.trackingUrl || "",
    estimatedDeliveryDate = order.estimatedDeliveryDate || null,
    customNote = "",
    status = order.orderStatus || "Shipped",
  } = options;

  const { shippingAddress = {}, items = [], total = 0, currency = "AED", _id } = order;
  const customerEmail = shippingAddress.email || (order.userId?.email) || "";
  const customerName = `${shippingAddress.firstName || "Valued"} ${shippingAddress.lastName || "Customer"}`.trim();
  const orderRef = (_id ? _id.toString().slice(-6).toUpperCase() : "ORDER");

  // Determine Tracking URL
  let trackingUrl = customTrackingUrl;
  if (!trackingUrl && trackingNumber) {
    const courierLower = (courierName || "").toLowerCase();
    if (courierLower.includes("dhl")) {
      trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
    } else if (courierLower.includes("fedex")) {
      trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    } else if (courierLower.includes("aramex")) {
      trackingUrl = `https://www.aramex.com/track/results?mode=0&ShipmentNumber=${trackingNumber}`;
    } else if (courierLower.includes("ups")) {
      trackingUrl = `https://www.ups.com/track?tracknum=${trackingNumber}`;
    } else {
      trackingUrl = `https://www.montres.ae/track-order?tracking=${trackingNumber}&order=${orderRef}`;
    }
  }

  // Format delivery date with 1-2 business days delivery promise
  let formattedDeliveryDate = "1–2 Business Days";
  if (estimatedDeliveryDate) {
    try {
      const d = new Date(estimatedDeliveryDate);
      const dateStr = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      formattedDeliveryDate = `${dateStr} (1–2 Business Days)`;
    } catch {
      formattedDeliveryDate = `${String(estimatedDeliveryDate)} (1–2 Business Days)`;
    }
  }

  // Generate Items HTML
  const itemsHTML = (items || []).map((item) => `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #f1f3f5;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${item.image ? `
              <td width="64" style="vertical-align: middle;">
                <img src="${item.image}" alt="${item.name || 'Product'}" width="54" height="54" style="border-radius: 8px; object-fit: cover; border: 1px solid #e9ecef; display: block;" />
              </td>
            ` : ''}
            <td style="padding-left: ${item.image ? '12px' : '0'}; vertical-align: middle;">
              <div style="font-weight: 600; font-size: 14px; color: #1a1a1a; line-height: 1.3;">${item.name || 'Luxury Timepiece'}</div>
              <div style="font-size: 12px; color: #868e96; margin-top: 4px;">
                ${item.sku ? `<span style="font-family: monospace; background: #f1f3f5; padding: 2px 6px; border-radius: 4px;">${item.sku}</span> &bull; ` : ''}
                Qty: ${item.quantity || 1}
              </div>
            </td>
            <td style="text-align: right; font-weight: 700; font-size: 14px; color: #1a1a1a; vertical-align: middle; white-space: nowrap;">
              ${currency} ${((item.price || 0) * (item.quantity || 1)).toLocaleString()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join("");

  const destinationAddress = [
    shippingAddress.address1,
    shippingAddress.address2,
    shippingAddress.city,
    shippingAddress.country
  ].filter(Boolean).join(", ");

  const emailSubject = `🚚 Shipment Confirmed: Order #${orderRef} Dispatched (1–2 Business Days Delivery)`;

  const plainText = `
Dear ${customerName},

Great news! Your Montres order #${orderRef} has been prepared, securely packaged, and dispatched.
Your package is in transit via ${courierName || 'DHL Express'} and is scheduled for delivery within 1 to 2 business days.

SHIPMENT DETAILS:
- Order Reference: #${orderRef}
- Carrier: ${courierName || 'DHL Express Priority'}
- Tracking Number: ${trackingNumber || 'Available via Tracking Link'}
- Estimated Delivery: ${formattedDeliveryDate}
- Destination: ${destinationAddress || 'Address on file'}

${trackingUrl ? `Track your live shipment: ${trackingUrl}\n` : ''}
${customNote ? `Special Fulfillment Note: ${customNote}\n` : ''}

Need assistance? Contact our concierge at ${process.env.ADMIN_EMAIL || 'concierge@montres.ae'}.

Warm regards,
Montres Trading L.L.C
Dubai, United Arab Emirates
`.trim();

  const mailOptions = {
    from: `"Montres Trading L.L.C" <${process.env.EMAIL_USER}>`,
    to: customerEmail,
    replyTo: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    subject: emailSubject,
    text: plainText,
    headers: {
      "X-Entity-Ref-ID": `ORDER-TRACK-${orderRef}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipment Tracking - Montres</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 30px 20px !important; }
      .tracking-box { padding: 20px !important; }
      .cta-button { width: 100% !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #212529;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 40px 0;">
    <tr>
      <td align="center">
        <table class="container" width="620" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.06); border: 1px solid #e9ecef;">
          
          <!-- ── Header Banner ── -->
          <tr>
            <td style="background: linear-gradient(135deg, #111418 0%, #1e242c 100%); padding: 44px 36px 36px; text-align: center;">
              <div style="font-size: 11px; letter-spacing: 5px; text-transform: uppercase; color: #c5a059; font-weight: 700; margin-bottom: 8px;">MONTRES LUXURY FULFILLMENT</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 0.5px;">Your Order Is On Its Way</h1>
              <div style="width: 36px; height: 2px; background-color: #c5a059; margin: 16px auto 0;"></div>
            </td>
          </tr>

          <!-- ── Main Content ── -->
          <tr>
            <td class="content-cell" style="padding: 36px 36px 20px;">
              <p style="font-size: 16px; line-height: 1.6; color: #343a40; margin: 0 0 16px;">
                Dear <strong>${customerName}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.7; color: #495057; margin: 0 0 24px;">
                Great news! Your package for order <strong style="color: #111418;">#${orderRef}</strong> has been carefully inspected, securely packaged, and dispatched. Your item will be delivered within <strong>1 to 2 business days</strong>.
              </p>

              <!-- ── Delivery Notice Pill ── -->
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 18px; margin-bottom: 26px; display: flex; align-items: center;">
                <span style="font-size: 13px; font-weight: 700; color: #065f46;">
                  ⚡ Express Delivery: Expected within 1–2 business days via ${courierName || 'Courier'}
                </span>
              </div>

              <!-- ── Tracking Details Card ── -->
              <div class="tracking-box" style="background: linear-gradient(145deg, #fdfbf7 0%, #f9f6ef 100%); border: 1px solid #eedec4; border-radius: 12px; padding: 26px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(197, 160, 89, 0.08);">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: top; padding-bottom: 14px;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8c733e; font-weight: 700;">Carrier Authority</div>
                      <div style="font-size: 16px; font-weight: 700; color: #1a1a1a; margin-top: 3px;">${courierName || 'DHL Express Priority'}</div>
                    </td>
                    <td style="text-align: right; vertical-align: top; padding-bottom: 14px;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8c733e; font-weight: 700;">Estimated Delivery</div>
                      <div style="font-size: 15px; font-weight: 700; color: #16a34a; margin-top: 3px;">${formattedDeliveryDate}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="border-top: 1px dashed #d8c29d; padding-top: 14px;">
                      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8c733e; font-weight: 700;">Tracking Number</div>
                      <div style="font-size: 20px; font-weight: 800; color: #111418; font-family: 'SFMono-Regular', Consolas, Menlo, monospace; margin-top: 4px; letter-spacing: 1px;">
                        ${trackingNumber || 'Available via Tracking Link'}
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- ── CTA Button ── -->
              ${trackingUrl ? `
                <div style="text-align: center; margin-bottom: 34px;">
                  <a href="${trackingUrl}" class="cta-button" style="display: inline-block; background-color: #111418; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 700; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 6px 20px rgba(0,0,0,0.15);">
                    Track Live Shipment &rarr;
                  </a>
                </div>
              ` : ''}

              <!-- ── Custom Logistics Note if provided ── -->
              ${customNote ? `
                <div style="background-color: #f1f3f5; border-left: 4px solid #c5a059; border-radius: 4px; padding: 14px 18px; margin-bottom: 30px; font-size: 13px; color: #495057; line-height: 1.6;">
                  <strong>Special Fulfillment Note:</strong><br />${customNote}
                </div>
              ` : ''}

              <!-- ── Shipping Destination ── -->
              <div style="background-color: #fafbfc; border: 1px solid #edf2f7; border-radius: 10px; padding: 18px 22px; margin-bottom: 32px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #868e96; font-weight: 700; margin-bottom: 6px;">
                  Delivery Address
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #212529; line-height: 1.5;">
                  ${customerName}<br />
                  ${destinationAddress || 'Address on file'}<br />
                  ${shippingAddress.phone ? `Phone: ${shippingAddress.phone}` : ''}
                </div>
              </div>

              <!-- ── Order Items Breakdown ── -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; color: #868e96; font-weight: 700; margin-bottom: 12px; border-bottom: 1px solid #f1f3f5; padding-bottom: 8px;">
                  Items In This Shipment
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemsHTML}
                </table>
              </div>

            </td>
          </tr>

          <!-- ── Support & Assistance ── -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 26px 36px; border-top: 1px solid #e9ecef; text-align: center;">
              <p style="font-size: 13px; color: #6c757d; margin: 0 0 6px;">
                Need help or have questions regarding your delivery?
              </p>
              <p style="font-size: 13px; margin: 0;">
                Email our concierge at <a href="mailto:${process.env.ADMIN_EMAIL || 'concierge@montres.ae'}" style="color: #c5a059; text-decoration: none; font-weight: 600;">${process.env.ADMIN_EMAIL || 'concierge@montres.ae'}</a>
              </p>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td style="background-color: #111418; padding: 32px 36px; text-align: center; color: #868e96;">
              <div style="font-size: 14px; font-weight: 700; color: #ffffff; letter-spacing: 3px; margin-bottom: 6px;">MONTRES</div>
              <div style="font-size: 11px; letter-spacing: 1px; color: #c5a059; margin-bottom: 14px;">FINE WATCHES & LUXURY ACCESSORIES</div>
              <p style="font-size: 11px; line-height: 1.6; margin: 0; color: #6c757d;">
                &copy; ${new Date().getFullYear()} Montres Store. Dubai, United Arab Emirates.<br />All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    if (!customerEmail) {
      console.warn("⚠️ No customer email found on order:", _id);
      return { success: false, message: "No customer email found" };
    }
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Shipment tracking email sent to ${customerEmail} (Order #${orderRef})`);
    return { success: true, message: "Shipment tracking email sent successfully", result };
  } catch (error) {
    console.error("❌ Error sending shipment tracking email:", error.message);
    throw error;
  }
};

/**
 * 📬 Delivery Status Update Notification (Delivered, Out for Delivery, etc.)
 */
const sendDeliveryStatusEmail = async (order, options = {}) => {
  return sendShipmentTrackingEmail(order, options);
};

// For CommonJS export
module.exports = {
  transporter,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendRestockNotification,
  sendOfferConfirmationEmail,
  sendOfferStatusUpdateEmail,
  sendCounterOfferEmail,
  sendAdminOfferNotification,
  sendManualOfferEmail,
  sendOfferExpiredEmail,
  sendNewsletterEmail,
  sendShipmentTrackingEmail,
  sendDeliveryStatusEmail,
  getWelcomeTemplate,
  getDiscountTemplate,
  getNewArrivalTemplate
};
