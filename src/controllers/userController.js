require('dotenv').config(); // <--- MUST be at the top, before using process.env
const userModel = require("../models/UserModel");
const ProductModel = require("../models/product");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { getRecommendations } = require("./productController");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");
const {sendWelcomeEmail} = require("../services/emailService")


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



const Newsletter = async (req, res) => {
  
};






 const Registration = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existingUser = await userModel.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    const accessToken = generateAccessToken(newUser._id, newUser.email);
    const refreshToken = generateRefreshToken(newUser._id);

    newUser.refreshToken = refreshToken;
    await newUser.save();
 
        // 🚀 Send Welcome Email (non-blocking)
    sendWelcomeEmail(newUser.email, newUser.name).catch(console.log);

    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(201)
      .json({
        message: "Registration successful",
        accessToken,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
        },
      });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await userModel.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

   const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = generateAccessToken(user._id, user.email);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        message: "Login successful",
        accessToken,
        user: { id: user._id, name: user.name, email: user.email },
      });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};



 const logout = async (req, res) => {
  try {
    // ✅ Clear refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Logout failed" });
  }
};


  const RefreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token)
      return res.status(401).json({ message: "No refresh token" });

    jwt.verify(
      token,
      process.env.USER_REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err)
          return res.status(403).json({ message: "Invalid or expired refresh token" });

        const user = await userModel.findById(decoded.id);
        if (!user || user.refreshToken !== token)
          return res.status(403).json({ message: "Invalid refresh token" });

        const newAccessToken = generateAccessToken(user._id, user.email);

        return res.status(200).json({ accessToken: newAccessToken });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};




const googleLogin = async (req, res) => {
  try {
    const { profile, token } = req.user; // <-- already normalized

    if (!profile || !profile.email) {
      console.error("Google profile missing email:", profile);
      return res
        .status(400)
        .json({ message: "Email is required from Google account" });
    }

    // Create user object for frontend
    const frontendUser = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
      provider: profile.provider,
    };

    // Redirect with token + user
 const redirectUrl = `${process.env.CLIENT_URL}/oauth-handler?token=${token}&user=${encodeURIComponent(
      JSON.stringify(frontendUser)
    )}`;
    console.log("✅ Redirecting to:", redirectUrl);
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Google login error:", err);
    return res.redirect(
      `${process.env.CLIENT_URL}/auth/login?error=google_login_failed`
    );
  }
};


const facebookLogin = async (req, res) => {
  try {
    const profile = req.user?.profile;
    const token = req.user?.token;

    if (!profile || !token) {
      return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=facebook_login_failed`);
    }

    const redirectUrl = `${process.env.CLIENT_URL}/oauth-handler?token=${token}&user=${encodeURIComponent(JSON.stringify(profile))}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Facebook login error:", error);
    res.redirect(`${process.env.CLIENT_URL}/auth/login?error=facebook_login_failed`);
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

const addToCart = async (req, res) => {
  try {
    const { userId } = req.user; // from auth middleware (JWT)
    const { productId, quantity } = req.body;

    console.log(productId);
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
};

//get cart

const getCart = async (req, res) => {
  try {
    const { userId } = req.user; // from JWT auth middleware

    const user = await userModel.findById(userId).populate("cart.productId");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Calculate total
    const totalAmount = user.cart.reduce((acc, item) => {
      const product = item.productId;
      if (!product) return acc;

      // use salePrice if available, otherwise regularPrice
      const price = product.salePrice || product.regularPrice || 0;
      return acc + price * item.quantity;
    }, 0);
    return res.status(200).json({
      message: "Cart fetched successfully",
      cart: user.cart,
      totalAmount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🗑️ Remove from Cart
const removeFromCart = async (req, res) => {
  try {
    console.log("working");
    const { userId } = req.user;
    const { productId } = req.body;

    // Find the user
    let user = await userModel.findById(userId).populate("cart.productId");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove the product from cart
    user.cart = user.cart.filter(
      (item) => item.productId._id.toString() !== productId
    );

    await user.save();

    res.status(200).json({
      message: "Removed from cart",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// 📝 Update Cart Quantities
const updateCart = async (req, res) => {
  try {
    const { userId } = req.user; // from JWT auth middleware
    const { items } = req.body; // [{ productId, quantity }]

    if (!items || !Array.isArray(items)) {
      return res
        .status(400)
        .json({ message: "Invalid request: items required" });
    }

    // Find the user
    const user = await userModel.findById(userId).populate("cart.productId");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update quantities
    user.cart = user.cart.map((cartItem) => {
      const updated = items.find(
        (i) => i.productId.toString() === cartItem.productId._id.toString()
      );
      if (updated) {
        return { ...cartItem.toObject(), quantity: updated.quantity };
      }
      return cartItem;
    });

    await user.save();

    // Recalculate total amount
    const totalAmount = user.cart.reduce((acc, item) => {
      const product = item.productId;
      if (!product) return acc;
      const price = product.salePrice || product.regularPrice || 0;
      return acc + price * item.quantity;
    }, 0);

    // Prepare cart items for frontend
    const cartItems = user.cart.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
    }));

    const recommended = await getRecommendations(cartItems);

    res.status(200).json({
      message: "Cart updated successfully",
      cart: user.cart,
      totalAmount,
      recommended,
    });
  } catch (error) {
    console.error("Update Cart Error:", error);
    res.status(500).json({ message: error.message });
  }
};



// getrecommed products
const recommendationsProduct = async (req, res) => {
  try {
    const { userId } = req.user; // from JWT auth middleware

    const user = await userModel.findById(userId).populate("cart.productId");
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Filter out null product references
    const validCartItems = user.cart.filter((item) => item.productId);

    const cartItems = validCartItems.map((item) => ({
      productId: item.productId._id,
      quantity: item.quantity,
    }));

    const recommended = await getRecommendations(cartItems);

    return res.status(200).json({
      message: "Recommendations fetched successfully",
      recommended,
    });
  } catch (error) {
    console.error("Update Cart Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// wishilist

const createWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, isDefault } = req.body;

    let user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent duplicate wishlist names
    const existing = user.wishlistGroups.find(
      (w) => w.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ message: "Wishlist name already exists" });
    }

    // If marked as default, unset old default
    if (isDefault) {
      user.wishlistGroups.forEach((w) => (w.isDefault = false));
    }

    user.wishlistGroups.push({ name, isDefault });
    await user.save();

    res
      .status(201)
      .json({ message: "Wishlist created", wishlists: user.wishlistGroups });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// get Wishlist names

const getWishlists = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await userModel
      .findById(userId)
      .select(
        "wishlistGroups._id wishlistGroups.name wishlistGroups.isDefault"
      );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      wishlists: user.wishlistGroups.map((w) => ({
        id: w._id, // 👈 important
        name: w.name,
        isDefault: w.isDefault,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 💖 Add to Wishlist

const addToWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { wishlistId, productId } = req.body;

    let user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const wishlist = user.wishlistGroups.id(wishlistId);
    if (!wishlist)
      return res.status(404).json({ message: "Wishlist not found" });

    const alreadyInWishlist = wishlist.items.find(
      (item) => item.productId.toString() === productId
    );
    if (alreadyInWishlist)
      return res.status(400).json({ message: "Already in this wishlist" });

    wishlist.items.push({ productId });
    await user.save();

    res.status(200).json({ message: "Added to wishlist", wishlist });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all wishlists for user

const getAllwishlist = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await userModel
      .findById(userId)
      .populate("wishlistGroups.items.productId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const wishlists = user.wishlistGroups.map((wishlist) => ({
      id: wishlist._id,
      name: wishlist.name,
      isDefault: wishlist.isDefault,
      items: wishlist.items
        .filter((item) => item.productId) // ✅ Skip null products
        .map((item) => ({
          id: item.productId._id,
          name: item.productId.name,
          salePrice: item.productId.salePrice,
          regularPrice: item.productId.regularPrice,
          image: item.productId.images?.[0] || null,
        })),
    }));

    res.status(200).json({ wishlists });
  } catch (error) {
    console.error("Error fetching wishlists:", error);
    res.status(500).json({ message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { wishlistId, productId } = req.body; // ✅ wishlistId + productId needed

    let user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Find the specific wishlist group
    const wishlist = user.wishlistGroups.id(wishlistId);
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // ✅ Remove the product from items
    wishlist.items = wishlist.items.filter(
      (item) => item.productId.toString() !== productId
    );

    await user.save();

    res.status(200).json({ message: "Removed from wishlist", wishlist });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ message: error.message });
  }
};

const togglePublicSharing = async (req, res) => {
  try {
    const { userId } = req.user;
    const { wishlistId } = req.params;
    const { isPublic } = req.body;

    // // ✅ Validate isPublic
    // if (typeof isPublic !== "boolean") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "isPublic field is required and must be a boolean",
    //   });
    // }

    // ✅ Find user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Find wishlist by subdocument ID
    const wishlist = user.wishlistGroups.id(wishlistId);
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    wishlist.isPublic = isPublic;

    if (isPublic) {
      // Generate slug if making public and slug doesn't exist
      if (!wishlist.publicSlug) {
        wishlist.publicSlug = wishlist._id.toString();
      }
    } else {
    }

    // ✅ Save the user document
    await user.save();

    res.json({
      success: true,
      message: `Wishlist is now ${isPublic ? "public" : "private"}`,
      wishlist: {
        id: wishlist._id,
        name: wishlist.name,
        isPublic: wishlist.isPublic,
        publicSlug: wishlist.publicSlug,
        isDefault: wishlist.isDefault,
        items: wishlist.items,
      },
    });
  } catch (error) {
    console.error("❌ Toggle public sharing error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating wishlist visibility",
      error: error.message, // Include error message for debugging
    });
  }
};

// Empty wishlist - Remove all items from a specific wishlist
const Emptywishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { wishlistId } = req.params;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the specific wishlist group
    const wishlistGroup = user.wishlistGroups.id(wishlistId);
    if (!wishlistGroup) {
      return res.status(404).json({ message: "Wishlist not found" });
    }
    // Empty the items array
    wishlistGroup.items = [];

    await user.save();

    res.status(200).json({
      message: "Wishlist emptied successfully",
      wishlist: {
        id: wishlistGroup._id,
        name: wishlistGroup.name,
        isDefault: wishlistGroup.isDefault,
        items: wishlistGroup.items,
      },
    });
  } catch (error) {
    console.error("Error emptying wishlist:", error);
    res.status(500).json({ message: error.message });
  }
};

// Set default wishlist
const Setdefaultwishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { wishlistId } = req.params;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the wishlist to set as default
    const targetWishlist = user.wishlistGroups.id(wishlistId);
    if (!targetWishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Reset all wishlists to non-default
    user.wishlistGroups.forEach((wishlist) => {
      wishlist.isDefault = false;
    });

    // Set the target wishlist as default
    targetWishlist.isDefault = true;

    await user.save();

    res.status(200).json({
      message: "Default wishlist updated successfully",
      wishlists: user.wishlistGroups.map((w) => ({
        id: w._id,
        name: w.name,
        isDefault: w.isDefault,
        items: w.items,
      })),
    });
  } catch (error) {
    console.error("Error setting default wishlist:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete entire wishlist
const Deleteentirewishlist = async (req, res) => {
  try {
     const { userId } = req.user;
    const { wishlistId } = req.params;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the wishlist to delete
    const wishlistToDelete = user.wishlistGroups.id(wishlistId);
    if (!wishlistToDelete) {
      return res.status(404).json({ message: "Wishlist not found" });
    }

    // Prevent deletion of default wishlist
    if (wishlistToDelete.isDefault) {
      return res
        .status(400)
        .json({ message: "Cannot delete default wishlist" });
    }

    // // Prevent deletion if it's the only wishlist
    // if (user.wishlistGroups.length <= 1) {
    //   return res
    //     .status(400)
    //     .json({ message: "Cannot delete the only wishlist" });
    // }

    // Remove the wishlist
    user.wishlistGroups.pull({ _id: wishlistId });

    await user.save();

    res.status(200).json({
      message: "Wishlist deleted successfully",
      wishlists: user.wishlistGroups.map((w) => ({
        id: w._id,
        name: w.name,
        isDefault: w.isDefault,
        items: w.items,
      })),
    });
  } catch (error) {
    console.error("Error deleting wishlist:", error);
    res.status(500).json({ message: error.message });
  }
};



// 📦 Get My Orders

const getMyOrders = async (req, res) => {
  try {
    const { userId } = req.user;

    let user = await userModel
      .findById(userId)
      .populate("myOrders.items.productId");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ orders: user.myOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const convertprice = async (req, res) => {
  const { amount, from, to } = req.query;

  // Validate input
  if (!amount || !from || !to) {
    return res.status(400).json({ error: "Missing params (amount, from, to)" });
  }

  try {
    // Call Exchangerate-API (v6)
    const response = await axios.get(
      `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/latest/${from}`
    );

    if (response.data.result !== "success") {
      return res
        .status(500)
        .json({ error: "API call failed", details: response.data });
    }

    // Get conversion rate
    const rate = response.data.conversion_rates[to];
    if (!rate) {
      return res.status(400).json({ error: `Currency ${to} not supported` });
    }

    // Calculate converted amount
    const converted = (parseFloat(amount) * rate).toFixed(2);

    res.json({
      base: from,
      target: to,
      rate,
      amount: parseFloat(amount),
      converted: Number(converted),
    });
    ("");
  } catch (err) {
    console.error("Conversion Error:", err.response?.data || err.message);
    res.status(500).json({ error: "Conversion failed" });
  }
};



const currencyConver = async (req, res) => {
  const { amount, from, to } = req.query;

  // Validate input
  if (!amount || !from || !to) {
    return res.status(400).json({
      error: "Missing params (amount, from, to)",
    });
  }

 try {
    const response = await axios.get(
      "https://api.currencyapi.com/v3/latest",
      {
        headers: {
          apikey: process.env.CURRENCY_API_KEY, // ✅ HEADER, NOT PARAM
        },
        params: {
          base_currency: from,
          currencies: to,
        },
      }
    );

    // Get rate
    const rate = response.data?.data?.[to]?.value;

    if (!rate) {
      return res.status(400).json({
        error: `Currency ${to} not supported`,
      });
    }

    const converted = (parseFloat(amount) * rate).toFixed(2);

    res.json({
      base: from,
      target: to,
      rate,
      amount: Number(amount),
      converted: Number(converted),
    });
  } catch (err) {
    console.error("CurrencyAPI Error:", err.response?.data || err.message);
    res.status(500).json({
      error: "Currency conversion failed",
    });
  }
};


//get cart Count
const getCartCount = async (req, res) => {
  try {
    const { userId } = req.user; 
    console.log(userId)
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const user = await userModel.findById(userId).select("cart");

    if (!user) return res.status(404).json({ message: "User not found" });

    const cartCount = user.cart.reduce((total, item) => total + item.quantity, 0);

    res.status(200).json({ cartCount });
  } catch (error) {
    console.error("Error fetching cart count:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//get wishhlist count

const getWishlistCount = async (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const user = await userModel.findById(userId).select("wishlistGroups");

    if (!user) return res.status(404).json({ message: "User not found" });

    // Total items across all wishlist groups
    const wishlistCount = user.wishlistGroups.reduce(
      (acc, group) => acc + group.items.length,
      0
    );

    res.status(200).json({ wishlistCount });
  } catch (error) {
    console.error("Error fetching wishlist count:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  Registration,
  Login,
  forgotPassword,
  ResetPassword,
  removeFromCart,
  addToCart,
  addToWishlist,
  getMyOrders,
  removeFromWishlist,
  convertprice,
  createWishlist,
  getWishlists,
  Deleteentirewishlist,
  Setdefaultwishlist,
  Emptywishlist,
  getAllwishlist,
  togglePublicSharing,
  getCart,
  updateCart,
  recommendationsProduct,
  RefreshToken,
  getCartCount,
  getWishlistCount,
  logout,
  googleLogin,
  facebookLogin,
  Newsletter,
  currencyConver
  };

