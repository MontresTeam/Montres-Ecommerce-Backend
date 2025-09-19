require('dotenv').config();
const express = require('express');
const connectDB = require("./config/db");
const cors = require('cors');


const PORT = process.env.PORT || 9000;
const app = express();
const productRoutes = require("./routes/productRoutes");
 
// Connect to database 
connectDB();


// Middlewares
app.use(cors());       
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
app.use("/api/createProduct",productRoutes)

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
