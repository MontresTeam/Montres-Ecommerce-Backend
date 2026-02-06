const fs = require("fs");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const Product = require("./product");
const cloudinary = require("cloudinary").v2;

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: "dkjikgwqi",
  api_key: "691197166358735",
  api_secret: "hHzf0lMK1EgWshxZznDxuu2cAUI",
});

const MONGO_URI =
  "mongodb://monterodeveloper82_db_user:Montres123@ac-x1yeyl4-shard-00-00.xbg6rgl.mongodb.net:27017,ac-x1yeyl4-shard-00-01.xbg6rgl.mongodb.net:27017,ac-x1yeyl4-shard-00-02.xbg6rgl.mongodb.net:27017/montresDB?ssl=true&replicaSet=atlas-ipf6s3-shard-0&authSource=admin&retryWrites=true&w=majority&appName=MontersTeam";

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
}

// ✅ Upload helper
async function uploadToCloudinary(imagePathOrUrl) {
  try {
    const result = await cloudinary.uploader.upload(imagePathOrUrl, {
      folder: "MontresTradingLLC/products",
      use_filename: true,
      unique_filename: false,
    });
    return { url: result.secure_url, public_id: result.public_id };
  } catch (err) {
    console.error("❌ Cloudinary upload error:", imagePathOrUrl, err.message);
    return null;
  }
}

async function importProducts() {
  await connectDB();

  const results = [];

  fs.createReadStream("Montres Trading LLC products final .csv")
    .pipe(csv())
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", async () => {
      console.log("✅ CSV file successfully processed");

      const products = [];

      for (const row of results) {
        // Upload images
        let uploadedImages = [];
        if (row.Images) {
          const imgList = row.Images.split(",");
          for (const img of imgList) {
            const uploaded = await uploadToCloudinary(img.trim());
            if (uploaded) uploadedImages.push(uploaded);
          }
        }

        products.push({
          productId: row.ID && !isNaN(row.ID) ? Number(row.ID) : null,
          type: row.Type,
          sku: row.SKU,
          gtin: row["GTIN, UPC, EAN, or ISBN"],
          name: row.Name,
          published: row.Published === "1",
          featured: row["Is featured?"] === "1",
          visibility: row["Visibility in catalog"],
          shortDescription: row["Short description"],
          description: row.Description,
          categoriesOne: row["categoris1"] || null,
          subcategory: row["subcategory"] || null,
          gender:row['gender']||"unisex",
          salePrice: row["Sale price"] ? Number(row["Sale price"]) : null,
          regularPrice: row["Regular price"] ? Number(row["Regular price"]) : null,
          dateSaleStart: row["Date sale price starts"] || null,
          dateSaleEnd: row["Date sale price ends"] || null,
          taxStatus: row["Tax status"],
          taxClass: row["Tax class"],
          inStock: row["In stock?"] === "1",
          stockQuantity: row.Stock ? Number(row.Stock) : 0,
          categories: row.Categories ? row.Categories.split(",") : [],
          tags: row.Tags ? row.Tags.split(",") : [],
          images: uploadedImages, // ✅ Cloudinary URLs
          meta: row,
        });
      }

      try {
        await Product.insertMany(products);
        // console.log(products[0]);
        console.log(`✅ Imported ${products.length} products into MongoDB`);
      } catch (err) {
        console.error("❌ Error inserting products:", err);
      } finally {
        mongoose.connection.close();
      }
    });
}

importProducts();
