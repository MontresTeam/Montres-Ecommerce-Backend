const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

// Cart schema
const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, default: 1 },
});

// Wishlist schema
const wishlistItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  addedAt: { type: Date, default: Date.now },
});

const wishlistGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  publicSlug: { type: String, unique: true, sparse: true },
  items: [wishlistItemSchema],
});

// Order schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  items: [
    { productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, quantity: { type: Number, required: true } },
  ],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["card", "cash", "wallet"], required: true },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, validate: [validator.isEmail, "Invalid Email"] },
    password: { type: String, required: true, minlength: 8 },
    resetPasswordToken: String,
    refreshToken: String,
    cart: [cartItemSchema],
    wishlistGroups: [wishlistGroupSchema],
    myOrders: [orderSchema],
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
