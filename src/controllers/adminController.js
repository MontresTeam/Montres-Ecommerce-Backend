const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Inbuilt Admin Users
const admins = [
  {
    id: 1,
    username: "ceo",
    password: bcrypt.hashSync("ceo123", 10),
    role: "ceo",
    profile: null,
  },
  {
    id: 2,
    username: "sales",
    password: bcrypt.hashSync("sales123", 10),
    role: "sales",
    profile: null,
  },
  {
    id: 3,
    username: "developer",
    password: bcrypt.hashSync("dev123", 10),
    role: "developer",
    profile: null,
  },
];

// Admin login controller
const adminlogin = async (req, res) => {
  try {
    const { username, password, profileUrl } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const admin = admins.find((a) => a.username === username);
    if (!admin) return res.status(400).json({ message: "Invalid username" });

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return res.status(400).json({ message: "Invalid password" });

    // ✅ If Cloudinary profile URL exists, update admin profile
    if (profileUrl) {
      admin.profile = profileUrl;
    }

    // Generate JWT
    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      profile: admin.profile || null,
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { adminlogin, admins };
