const express = require("express");
const router = express.Router();
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");

// Routes
router.post("/create", createCustomer); // Create user
router.get("/All", getAllCustomers); // Get all users
router.get("/:id", getCustomerById); // Get user by ID
router.put("/:id", updateCustomer); // Update user
router.delete("/:id", deleteCustomer); // Delete user

module.exports = router;
