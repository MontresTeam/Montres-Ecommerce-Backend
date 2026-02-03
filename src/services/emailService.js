const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password, not your Gmail password
  },
  tls: {
    rejectUnauthorized: false, // <-- allows self-signed certificates
  },
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Montres</title>
        <style>
          @media only screen and (max-width: 600px) {
            .container {
              width: 100% !important;
              padding: 20px !important;
            }
            .header {
              padding: 20px 10px !important;
            }
            .content {
              padding: 20px 15px !important;
            }
            .btn {
              display: block !important;
              width: 90% !important;
              margin: 0 auto !important;
              text-align: center !important;
            }
          }
        </style>
      </head>
      <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f7f7f7;">
        
        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f7f7;">
          <tr>
            <td align="center">
              <!-- Email Container -->
              <table class="container" width="600" cellpadding="0" cellspacing="0" style="margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
                
                <!-- Header with Gradient -->
                <tr>
                  <td class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);padding:40px 30px;text-align:center;">
                    <table width="100%">
                      <tr>
                        <td align="center">
                          <div style="background-color:rgba(255,255,255,0.15);width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                            <span style="font-size:40px;color:#fff;">👋</span>
                          </div>
                          <h1 style="color:#ffffff;font-size:28px;font-weight:600;margin:0 0 10px;letter-spacing:-0.5px;">Welcome to Montres!</h1>
                          <p style="color:rgba(255,255,255,0.85);font-size:16px;margin:0;line-height:1.5;">Your account is ready</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Content Section -->
                <tr>
                  <td class="content" style="padding:40px 30px;">
                    
                    <!-- Greeting -->
                    <table width="100%">
                      <tr>
                        <td>
                          <h2 style="color:#333333;font-size:22px;font-weight:600;margin:0 0 20px;">Hello ${name},</h2>
                          <p style="color:#666666;font-size:16px;line-height:1.6;margin:0 0 20px;">
                            Thank you for creating an account with <strong style="color:#667eea;">Montres</strong>. 
                            We're thrilled to have you join our community of watch enthusiasts!
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Benefits List -->
                    <table width="100%" style="margin:30px 0;">
                      <tr>
                        <td>
                          <table width="100%">
                            <tr>
                              <td width="40" style="vertical-align:top;">
                                <div style="background-color:#f0f4ff;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#667eea;">✓</span>
                                </div>
                              </td>
                              <td style="padding-left:15px;">
                                <p style="color:#333333;font-size:15px;margin:0 0 10px;font-weight:500;">Browse Premium Watches</p>
                                <p style="color:#666666;font-size:14px;margin:0;line-height:1.5;">Discover our curated collection of luxury and classic timepieces</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height:20px;"></td></tr>
                      <tr>
                        <td>
                          <table width="100%">
                            <tr>
                              <td width="40" style="vertical-align:top;">
                                <div style="background-color:#f0f4ff;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#667eea;">✓</span>
                                </div>
                              </td>
                              <td style="padding-left:15px;">
                                <p style="color:#333333;font-size:15px;margin:0 0 10px;font-weight:500;">Manage Orders Easily</p>
                                <p style="color:#666666;font-size:14px;margin:0;line-height:1.5;">Track shipments and view order history in your account</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr><td style="height:20px;"></td></tr>
                      <tr>
                        <td>
                          <table width="100%">
                            <tr>
                              <td width="40" style="vertical-align:top;">
                                <div style="background-color:#f0f4ff;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
                                  <span style="color:#667eea;">✓</span>
                                </div>
                              </td>
                              <td style="padding-left:15px;">
                                <p style="color:#333333;font-size:15px;margin:0 0 10px;font-weight:500;">Exclusive Offers</p>
                                <p style="color:#666666;font-size:14px;margin:0;line-height:1.5;">Be the first to know about new arrivals and special promotions</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table width="100%" style="margin:40px 0 30px;">
                      <tr>
                        <td align="center">
                          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                             class="btn" 
                             style="display:inline-block;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:8px;font-weight:600;font-size:16px;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(102,126,234,0.3);transition:all 0.3s ease;">
                            Access Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Help Text -->
                    <table width="100%">
                      <tr>
                        <td style="padding:20px 0;border-top:1px solid #eeeeee;">
                          <p style="color:#999999;font-size:14px;line-height:1.6;margin:0;text-align:center;">
                            If you did not create this account, please ignore this email.<br>
                            Need help? Contact us at <a href="mailto:support@montres.com" style="color:#667eea;text-decoration:none;">support@montres.com</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f9f9f9;padding:30px;text-align:center;">
                    <p style="color:#888888;font-size:14px;margin:0 0 15px;">
                      Montres Store &copy; ${new Date().getFullYear()}
                    </p>
                    <p style="color:#aaaaaa;font-size:12px;margin:0;line-height:1.5;">
                      123 Luxury Lane, Watch District<br>
                      Geneva, Switzerland
                    </p>
                  </td>
                </tr>
                
              </table>
              
              <!-- Bottom Spacing -->
              <table width="100%" style="margin:30px 0;">
                <tr>
                  <td style="text-align:center;">
                    <p style="color:#aaaaaa;font-size:12px;margin:0;">
                      You received this email because you signed up for Montres.<br>
                      <a href="#" style="color:#999999;text-decoration:underline;">Unsubscribe</a> | 
                      <a href="#" style="color:#999999;text-decoration:underline;">Privacy Policy</a> | 
                      <a href="#" style="color:#999999;text-decoration:underline;">Terms of Service</a>
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
    // FIX: Changed from mailTransporter to transporter
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    return { success: true, message: 'Welcome email sent successfully' };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// For CommonJS export
module.exports = { transporter, sendWelcomeEmail };