require('dotenv').config(); // Must be first
const express = require('express');
const connectDB = require("./config/db");
const cors = require('cors');
// const session = require('express-session');
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const recommendRoutes = require('./routes/recommendRoutes')
const productRoutes = require("./routes/productRoutes");
const userRoute = require("./routes/userRoute");
const watchesRoute = require("./routes/watchesRoute");
const leatherRoute = require("./routes/leatheRouter");
const accessoriesRoute = require("./routes/accessoriesRouter");
const homeProductsRoute = require("./routes/homeProductRoutes");
const adminProductRoute = require("./routes/adminPrdouctRouter");
const addressRoutes = require("./routes/addressRoutes");
const contactRoutes = require("./routes/contactFormRoutes");
const orderRoute = require("./routes/orderRoutes");
const customerRoutes = require("./routes/customerRoutes");
const filterRouter = require('./routes/filterRouter')
const tabbyRouter = require('./routes/tabbyRouter')
const tamaraRouter = require('./routes/tamaraRouter');
const invontryStock = require('./routes/inventoryRoutes')
const adminsRoute = require('./routes/adminRoute')
const seoRoutes = require('./routes/seoPage.routes')
const webhookRoute = require("./routes/webhookRoutes");
const brandRoutes = require('./routes/brandRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const offerRoutes = require('./routes/offerRoutes');



const PORT = process.env.PORT;



connectDB();



const app = express();

// ✅ CORS setup
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  process.env.LOCAL_URL,
  "https://www.montres.ae",
  "https://montres.ae",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked for origin: ${origin}`);
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);


// ✅ Webhooks (Must be before body parser for raw signature verification)
app.use("/api", webhookRoute);

// ✅ Body parsing & cookies
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Routes
app.get("/", (req, res) => res.send("Welcome To Montres Store"));

// Specific routes first
app.use("/api/tabby", tabbyRouter);
app.use("/api/tamara", tamaraRouter);


app.use("/api/contact", contactRoutes);
app.use("/api/admin/order", orderRoute);
app.use("/api/address", addressRoutes);
app.use("/api/payment", orderRoute);
app.use("/api/order", orderRoute);
app.use("/api/MyOrders", orderRoute);

app.use("/api/Auth", userRoute);

app.use("/api/products", productRoutes);
app.use("/api/createProduct", productRoutes);
app.use("/api/watches", watchesRoute);
app.use("/api/leather", leatherRoute);
app.use("/api/accessories", accessoriesRoute);
app.use("/api/home", homeProductsRoute);
app.use("/api/admin/product", adminProductRoute);
app.use("/api/customers", customerRoutes);
app.use("/api/filter", filterRouter);
app.use('/api/recommend', recommendRoutes);
app.use('/api/invontry', invontryStock)
app.use('/api/admin', adminsRoute)
app.use("/api/seo-pages", seoRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/offers", offerRoutes);

// ✅ Catch-all generic /api route MUST be last
app.use("/api", productRoutes);



// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
