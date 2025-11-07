const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const homeProductsSchema = new Schema({
  newArrivals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
  montresTrusted: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
  ],
});

// Validation: max 6 products each
homeProductsSchema.path("newArrivals").validate(function (value) {
  return value.length <= 6;
}, "You can add up to 6 products only in New Arrivals");

homeProductsSchema.path("montresTrusted").validate(function (value) {
  return value.length <= 6;
}, "You can add up to 6 products only in Montres Trusted");

module.exports = mongoose.model("HomeProducts", homeProductsSchema);
