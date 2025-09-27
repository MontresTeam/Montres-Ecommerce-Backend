const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const Product = require("./product"); // your Product model

// 🔹 Replace with your MongoDB connection string
const MONGO_URI =   "mongodb://monterodeveloper82_db_user:Montres123@ac-x1yeyl4-shard-00-00.xbg6rgl.mongodb.net:27017,ac-x1yeyl4-shard-00-01.xbg6rgl.mongodb.net:27017,ac-x1yeyl4-shard-00-02.xbg6rgl.mongodb.net:27017/montresDB?ssl=true&replicaSet=atlas-ipf6s3-shard-0&authSource=admin&retryWrites=true&w=majority&appName=MontersTeam";

async function runUpdate() {
  try {
    // 1. Connect DB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // 2. Process CSV
    fs.createReadStream("Montres Trading LLC products final .csv")
      .pipe(csv())
      .on("data", async (row) => {
        try {
          const subcategoryArray = row.subcategory
            ? row.subcategory.split(",").map((v) => v.trim())
            : [];

          await Product.updateOne(
            {productId: row.ID }, // match by SKU (change to productId if needed)
            { $set: { subcategory: subcategoryArray } }
          );

          console.log(`✅ Updated SKU ${row.SKU} -> ${subcategoryArray}`);
        } catch (err) {
          console.error("❌ Error updating row:", err);
        }
      })
      .on("end", async () => {
        console.log("🎉 CSV update finished.");
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
      });
  } catch (err) {
    console.error("❌ Error:", err);
    mongoose.disconnect();
  }
}

runUpdate();
