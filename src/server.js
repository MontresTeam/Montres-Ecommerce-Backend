require('dotenv').config();
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
connectDB();




// Middlewares
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
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
