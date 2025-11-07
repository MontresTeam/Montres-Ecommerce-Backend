const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Schema for Home Products Grid
const brandNewSchema = new Schema({
  products: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    validate: {
      validator: function (value) {
        return value.length <= 6; // ✅ Limit to 6 product IDs only
      },
      message: "You can add up to 6 products only",
    },
  },
});

// ✅ Correct export (model name + schema)
module.exports = mongoose.model("BrandNew", brandNewSchema);
