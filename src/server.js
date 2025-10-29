require('dotenv').config(); // <--- MUST be at the top, before using process.env
const express = require('express');
const connectDB = require("./config/db");
const cors = require('cors');
const path = require("path");
const PORT = process.env.PORT || 9000;
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const productRoutes = require("./routes/productRoutes");
const userRoute = require('./routes/userRoute')
const watchesRoute = require('./routes/watchesRoute')
const leatherRoute = require('./routes/leatheRouter')
const accessoriesRoute = require('./routes/accessoriesRouter')
const homeProductsRoute =require('./routes/homeProductRoutes')
const adminProductRoute=require('./routes/adminPrdouctRouter')
const contactRoutes = require("./routes/contactFormRoutes");
const orderRoute = require('./routes/orderRoutes');
const customerRoutes = require('./routes/customerRoutes')
const passport = require('passport');
connectDB();

// Passport strategies
// require("./strategies/googleStrategy");
// require("./strategies/facebookStrategy");



const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  process.env.LOCAL_URL,

];
console.log("Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow requests like Postman
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


app.use(passport.initialize());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));



// Routes
app.get('/', (req, res) => {
    res.send("Welcome To Montres Store"); 
});

// Error handler 
app.use((err, req, res, next) => { 
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use("/api/contact",contactRoutes)
app.use("/api/admin/order",orderRoute)
app.use("/api/order",orderRoute)
app.use("/api/MyOrders", orderRoute);
app.use("/api/products", productRoutes);
app.use("/api",productRoutes)
app.use("/api/createProduct",productRoutes)
app.use('/api/Auth', userRoute)
app.use('/api/watches', watchesRoute);
app.use('/api/leather', leatherRoute);
app.use('/api/accessories', accessoriesRoute);
app.use('/api/home',homeProductsRoute );
app.use('/api/admin/product',adminProductRoute)
app.use("/api/customers", customerRoutes);


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
