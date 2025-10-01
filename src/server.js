require('dotenv').config();
const express = require('express');
const connectDB = require("./config/db");
const cors = require('cors');
const PORT = process.env.PORT || 9000;
const app = express();
const bodyParser = require("body-parser");
const passport = require("passport")
const session = require("express-session")
const productRoutes = require("./routes/productRoutes");
const userRoute = require('./routes/userRoute')

connectDB();




// Middlewares
app.use(cors());  
app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
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


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
