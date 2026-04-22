const fs = require("fs");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const Product = require("./product");
const AWS = require("aws-sdk");
const axios = require("axios");
require("dotenv").config();

// ✅ AWS S3 config (reads from .env)
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});
const BUCKET = process.env.S3_BUCKET;

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

// ✅ Upload helper — downloads image URL then uploads to S3
async function uploadToS3(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const contentType = response.headers["content-type"] || "image/jpeg";
    const ext = contentType.split("/")[1] || "jpg";
    const key = `MontresTradingLLC/products/${Date.now()}-import.${ext}`;

    const result = await s3
      .upload({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
      .promise();

    return { url: result.Location };
  } catch (err) {
    console.error("❌ S3 upload error:", imageUrl, err.message);
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
            const uploaded = await uploadToS3(img.trim());
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
          images: uploadedImages, // ✅ S3 URLs
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
