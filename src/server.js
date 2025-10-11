require('dotenv').config(); // <--- MUST be at the top, before using process.env
const express = require('express');
const connectDB = require("./config/db");
const cors = require('cors');
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
const orderRoute = require('./routes/orderRoutes');
const passport = require('passport');
connectDB();

// Passport strategies
require("./strategies/googleStrategy");
require("./strategies/facebookStrategy");


app.use(cors({
  origin:process.env.CLIENT_URL, // or your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


app.use(passport.initialize());

// Middlewares


app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Routes
app.get('/', (req, res) => {
    res.send("Welcome To Montres Store"); 
});

// Error handler 
app.use((err, req, res, next) => { 
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.use("/api/order",orderRoute)
app.use("/api/products", productRoutes);
app.use("/api",productRoutes)
app.use("/api/createProduct",productRoutes)
app.use('/api/Auth', userRoute)
app.use('/api/watches', watchesRoute);
app.use('/api/leather', leatherRoute);
app.use('/api/accessories', accessoriesRoute);
app.use('/api/home',homeProductsRoute );


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
