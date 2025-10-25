const Customer = require("../models/customersModal");

// Create a new user
const createCustomer = async (req, res) => {
  try {
    const { serialNumber, username, email, designation, status } = req.body;

    // Check for duplicate email
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer)
      return res.status(400).json({ message: "Email already exists" });

    const customer = new Customer({
      serialNumber,
      username,
      email,
      designation,
      status,
    });

    await customer.save();
    res.status(201).json({ message: "Customer created successfully", customer });
  } catch (error) {
    console.error("Create Customer Error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// Get all users
const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.status(200).json({ customers });
  } catch (error) {
    console.error("Get Customers Error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// Get user by ID
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);

    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    res.status(200).json({ customer });
  } catch (error) {
    console.error("Get Customer By ID Error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// Update user
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const customer = await Customer.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    res
      .status(200)
      .json({ message: "Customer updated successfully", customer });
  } catch (error) {
    console.error("Update Customer Error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

// Delete user
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByIdAndDelete(id);

    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Delete Customer Error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports = {
  deleteCustomer,
  updateCustomer,
  getCustomerById,
  getAllCustomers,
  createCustomer
};
