// db.js
const mongoose = require("mongoose");

// Connect to MongoDB using environment variable
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connected successfully ✅");
  } catch (err) {
    console.error("Database connection error ❌:", err);
    process.exit(1); // Exit process if DB connection fails
  }
};

module.exports = connectDB;
