const mongoose = require("mongoose");

const connectDB = async function () {
  try {
    await mongoose.connect(process.env.MONGODB_URI); // ✅ no options needed
    console.log("DB connected successfully");
  } catch (error) {
    console.log("Error connecting to DB:", error);
    process.exit(1); // exit process if DB connection fails
  }
};

module.exports = connectDB;
