const fs = require("fs");
const mongoose = require("mongoose");
const csv = require("csv-parser");
const Product = require("./product");

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

async function importProducts() {
  await connectDB();

  const results = [];

  fs.createReadStream("product.csv")
    .pipe(csv())
    .on("data", (row) => {
      results.push(row);
    })
    .on("end", async () => {
      console.log("✅ CSV file successfully processed");

      const products = results.map((row) => ({
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
        images: row.Images
          ? row.Images.split(",").map((img) => ({ url: img.trim() }))
          : [],
        meta: row,
      }));

      try {
        await Product.insertMany(products);
        console.log(`✅ Imported ${products.length} products into MongoDB`);
      } catch (err) {
        console.error("❌ Error inserting products:", err);
      } finally {
        mongoose.connection.close();
      }
    });
}

importProducts();
