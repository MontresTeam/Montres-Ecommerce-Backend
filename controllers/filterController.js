const Product = require("../models/product");

const filerDatareferenceNumber = async (req, res) => {
  try {
    const data = await Product.aggregate([
      {
        $match: {
          referenceNumber: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$referenceNumber",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          value: "$_id",
          count: 1,
        },
      },
      {
        $sort: { value: 1 }, // optional: sorts alphabetically
      },
    ]);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { filerDatareferenceNumber };
