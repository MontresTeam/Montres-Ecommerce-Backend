const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");
const Product = require("./product"); // your Product model

const MONGO_URI =
  "mongodb://monterodeveloper82_db_user:Montres123@ac-x1yeyl4-shard-00-00.xbg6rgl.mongodb.net:27017,ac-x1yeyl4-shard-00-01.xbg6rgl.mongodb.net:27017,ac-x1yeyl4-shard-00-02.xbg6rgl.mongodb.net:27017/montresDB?ssl=true&replicaSet=atlas-ipf6s3-shard-0&authSource=admin&retryWrites=true&w=majority&appName=MontersTeam";

async function runUpdate() {
  try {
    // 1. Connect to DB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const updates = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream("cleaned.csv")
        .pipe(csv())
        .on("data", (row) => {
          // Category One
          const categorisOne = row["categoris1"] ? row["categoris1"].trim() : "";

          // Subcategories (split by comma if multiple)
          const subcategory = row["subcategory"]
            ? row["subcategory"].split(",").map((s) => s.trim()).filter(Boolean)
            : [];

          console.log(row.ID,  categorisOne, subcategory);

          updates.push(
            Product.updateOne(
              { productId: row.ID },
              {
                $set: {
                  categorisOne,
                  subcategory,
                },
              }
            )
              .then(() => {
                // console.log(`✅ Updated SKU ${row.ID}`);
              })
              .catch((err) => {
                console.error(`❌ Error updating SKU ${row.ID}:`, err);
              })
          );
        })
        .on("end", resolve)
        .on("error", reject);
    });

    // Wait for all updates
    await Promise.all(updates);
    console.log("🎉 CSV update finished.");

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Fatal error:", err);
    await mongoose.disconnect();
  }
}

runUpdate();
