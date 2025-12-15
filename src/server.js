require('dotenv').config(); // Must be first
const express = require('express');
const connectDB = require("./config/db");
const cors = require('cors');
const session = require('express-session');
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const passport = require("passport");
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

const PORT = process.env.PORT || 9000;



connectDB();

// ✅ Load Passport Strategies
require("./strategies/googleStrategy");
require("./strategies/facebookStrategy");

const app = express();

// ✅ CORS setup
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  process.env.ADMIN_URL,
  process.env.LOCAL_URL,
];
console.log("Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman / server requests
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Express session (must be BEFORE passport.initialize())
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // true if using HTTPS only
  })
);

// ✅ Passport initialization
app.use(passport.initialize());
app.use(passport.session()); // Important for persistent login sessions

// ✅ Body parsing & cookies
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Routes
app.get('/', (req, res) => res.send("Welcome To Montres Store"));

app.use("/api/contact", contactRoutes);
app.use("/api/admin/order", orderRoute);
app.use("/api/order", orderRoute);
app.use("/api/MyOrders", orderRoute);
app.use("/api/products", productRoutes);
app.use("/api", productRoutes);
app.use("/api/createProduct", productRoutes);
app.use("/api/Auth", userRoute);
app.use('/api/tabby',tabbyRouter)
app.use('/api/address', addressRoutes);;
app.use("/api/watches", watchesRoute);
app.use("/api/leather", leatherRoute);
app.use("/api/accessories", accessoriesRoute);
app.use("/api/home", homeProductsRoute);
app.use("/api/admin/product", adminProductRoute);
app.use("/api/customers", customerRoutes);
app.use("/api/filter",filterRouter);
app.use('/api/recommend', recommendRoutes);
app.use(tabbyRouter)
// ✅ Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
