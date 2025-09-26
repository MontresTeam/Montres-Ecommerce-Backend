const userModel = require("../models/UserModel");
const ProductModel = require("../models/product")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
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

// ✅ User Registration
const Registration = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // ✅ Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        status: "Fail",
        message: "All fields (name, email, password) are required.",
      });
    }

    // ✅ Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: "Fail",
        message: "Email already registered.",
      });
    }

    // ✅ Create new user (password is hashed in UserModel pre-save middleware)
    const newUser = await userModel.create({ name, email, password });

    res.status(201).json({
      status: "Success",
      message: "User registration successful 😊",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
};

// ✅ User Login
const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation
    if (!email || !password) {
      return res.status(400).json({
        status: "Fail",
        message: "Email and password are required.",
      });
    }

    // ✅ Check if user exists
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "Fail",
        message: "User not found.",
      });
    }

    // ✅ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: "Fail",
        message: "Invalid credentials.",
      });
    }

    console.log(isMatch, "Mathc");

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.USER_ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    // 5️⃣ Send response
    res.status(200).json({
      status: "Success",
      message: "Login successful 🎉",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "Error",
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
};

// forgotPassword -> with email send verification

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find User

    if (!email) {
      return res
        .status(400)
        .json({ status: "Fail", message: "Enter your email" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ status: "Fail", message: "User not found." });
    }
    const token = jwt.sign(
      { id: user._id },
      process.env.USER_ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" } // token valid for 15 minutes
    );

    user.resetPasswordToken = token;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await user.save();

    // 🔑 Create reset link
    const resetLink = `http://localhost:3000/ResetPassword/${user._id}/${token}`;

    const mailOptions = {
      from: `"Montres Trading L.L.C – The Art Of Time" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔑 Reset Your Password – Montres Trading L.L.C",
      html: `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>Password Reset</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellspacing="0" cellpadding="0" style="padding:40px 0;background-color:#f8fafc;">
      <tr>
        <td align="center">
          
          <!-- Card / Box -->
          <table cellpadding="0" cellspacing="0" width="100%" style="max-width:460px;background:#ffffff;border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
            
            <!-- Header -->
            <tr>
              <td align="center" style="padding:30px 25px 20px 25px;">
                <img src="https://yourdomain.com/logo.png" alt="Montres Logo" style="width:60px;height:auto;margin-bottom:12px;" />
                <h2 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">Montres Trading L.L.C</h2>
                <p style="margin:6px 0 0;font-size:14px;color:#64748b;">Reset your password</p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="border-top:1px solid #f1f5f9;"></td>
            </tr>
            
            <!-- Body -->
            <tr>
              <td style="padding:25px 30px;">
                <p style="font-size:14px;color:#334155;margin:0 0 15px 0;">
                  Hi ${user.name},
                </p>
                <p style="font-size:13px;color:#475569;line-height:1.6;margin:0 0 20px 0;">
                  Need to reset your password? No problem! Click the button below and you'll be on your way.  
                  If you did not request this, please ignore this email.
                </p>

                <!-- Button -->
                <div style="text-align:center;margin:30px 0;">
                  <a href="${resetLink}" 
                    style="background:#3b82f6;color:#ffffff;text-decoration:none;
                           padding:14px 40px;border-radius:8px;font-weight:600;
                           font-size:15px;display:inline-block;box-shadow:0 4px 12px rgba(59,130,246,0.4);">
                    Reset your password
                  </a>
                </div>

                <p style="font-size:11px;color:#94a3b8;text-align:center;margin:20px 0 0 0;">
                  This link will expire in <strong style="color:#ef4444;">15 minutes</strong>.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;padding:15px;text-align:center;border-top:1px solid #f1f5f9;">
                <p style="color:#64748b;font-size:11px;margin:0;">
                  © ${new Date().getFullYear()} Montres Trading L.L.C – The Art Of Time
                </p>
              </td>
            </tr>

          </table>
          <!-- End Card -->
        </td>
      </tr>
    </table>
  </body>
  </html>
  `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Email error:", error);
        return res
          .status(500)
          .json({ status: "Error", message: "Email not sent" });
      } else {
        console.log("Email sent:", info.response);
        return res.status(200).json({
          status: "Success",
          message: "Password reset link sent successfully",
        });
      }
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
};

// ResetPassword verification
const ResetPassword = async (req, res) => {
  try {
    const { id, token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    // 1️⃣ Check fields
    if (!newPassword || !confirmPassword) {
      return res
        .status(400)
        .json({ status: "Fail", message: "Both password fields are required" });
    }

    // 2️⃣ Check match
    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({ status: "Fail", message: "Passwords do not match" });
    }

    // ✅ Find user by ID
    const user = await userModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ status: "Fail", message: "User not found" });
    }

    // ✅ Check token and expiry
    if (user.resetPasswordToken !== token) {
      return res
        .status(400)
        .json({ status: "Fail", message: "Invalid or expired token" });
    }

    if (user.resetPasswordExpire < Date.now()) {
      return res
        .status(400)
        .json({ status: "Fail", message: "Reset link has expired" });
    }

    // ✅ Verify JWT
    try {
      jwt.verify(token, process.env.USER_ACCESS_TOKEN_SECRET);
    } catch (err) {
      return res
        .status(400)
        .json({ status: "Fail", message: "Invalid or expired token" });
    }

    // ✅ Set new password (NO MANUAL HASHING)
    user.password = newPassword;

    // ✅ Clear reset fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save(); // pre-save hook will hash password here

    return res.status(200).json({
      status: "Success",
      message:
        "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "Error", message: error.message });
  }
};



// 🛒 Add to Cart

const addToCart = async (req,res)=>{
   try {
    const { userId } = req.user; // from auth middleware (JWT)
    const { productId, quantity } = req.body;

    let user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

     const product = await ProductModel.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if product already in cart
    const cartItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );

      if (cartItem) {
      // update quantity
      cartItem.quantity += quantity;
    } else {
      user.cart.push({ productId, quantity });
    }

    await user.save();
    res.status(200).json({ message: "Added to cart", cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


// 🗑️ Remove from Cart


const removeFromCart = async (req,res)=>{
   try {
    const { userId } = req.user;
    const { productId } = req.body;

    
    let user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.cart = user.cart.filter(
      (item) => item.productId.toString() !== productId
    );
      await user.save();
    res.status(200).json({ message: "Removed from cart", cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}



// 💖 Add to Wishlist

const addToWishlist = async(req,res)=>{
  try {
      const { userId } = req.user;
    const { productId } = req.body;

    let user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // check duplicate
    const alreadyInWishlist = user.wishlist.find(
      (item) => item.productId.toString() === productId
    );
    if (alreadyInWishlist)
      return res.status(400).json({ message: "Already in wishlist" });

    user.wishlist.push({ productId });
    await user.save();
    res.status(200).json({ message: "Added to wishlist", wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// 🛍️ Place Order

const placeOrder = async(req,res)=>{
  try {
    const { userId } = req.user;
    const { paymentMethod } = req.body;
    
    let user = await userModel.findById(userId).populate("cart.productId");
    if (!user) return res.status(404).json({ message: "User not found" });

      if (user.cart.length === 0)
      return res.status(400).json({ message: "Cart is empty" });


       // calculate total
    const totalAmount = user.cart.reduce(
      (sum, item) => sum + item.productId.price * item.quantity,
      0
    );

    const order = {
      orderId: "ORD-" + Date.now(),
      items: user.cart.map((item) => ({
        productId: item.productId._id,
        quantity: item.quantity,
      })),
      totalAmount,
      paymentMethod,
      status: "pending",
    };

    user.myOrders.push(order);
    user.cart = []; // clear cart after order

    await user.save();

    res.status(201).json({ message: "Order placed", order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


// 📦 Get My Orders


const getMyOrders = async (req,res)=>{
   try {
    
   } catch (error) {
    
   }
}

module.exports = {
   Registration,
   Login, 
   forgotPassword, 
   ResetPassword,
   removeFromCart,
   addToCart,
   addToWishlist,
   placeOrder
   };
