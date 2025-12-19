const mongoose = require('mongoose');

const brandList = [
  "Aigner", "Akribos Xxiv", "Apogsum", "AquaMarin", "Aquaswiss", "Armin Strom",
  "Audemars Piguet", "Balenciaga", "Ball", "Bernhard H. Mayer", "Bertolucci",
  "Blancpain", "Borja", "Boss By Hugo Boss", "Boucheron", "Breguet",
  "Carl F. Bucherer", "Cartier", "Celine", "Chanel", "Charriol", "Chaumet",
  "Chopard", "Chronoswiss", "Citizen", "Concord", "Corum", "CT Scuderia",
  "De Grisogno", "Dior", "Dolce & Gabbana", "Dubey & Schaldenbrand", "Ebel",
  "Edox", "Elini", "Emporio Armani", "Erhard Junghans", "Favre Leuba", "Fendi",
  "Ferre Milano", "Franck Muller", "Frederique Constant", "Gerald Genta",
  "Gianfranco Ferre", "Giorgio Armani", "Girard Perregaux", "Giuseppe Zanotti",
  "Givenchy", "Glam Rock", "Goyard", "Graham", "Grimoldi Milano", "Gucci",
  "Harry Winston", "Hermes", "Hublot", "Hysek", "Jacob & Co.", "Jacques Lemans",
  "Jaeger LeCoultre", "Jean Marcel", "JeanRichard", "Jorg Hysek", "Joseph",
  "Junghans", "Just Cavalli", "Karl Lagerfeld", "KC", "Korloff", "Lancaster",
  "Locman", "Longines", "Louis Frard", "Louis Moine", "Louis Vuitton",
  "Marc by Marc Jacobs", "Marc Jacobs", "Martin Braun", "Mauboussin",
  "Maurice Lacroix", "Meyers", "Michael Kors", "MICHAEL Michael Kors", "Mido",
  "Montblanc", "Montega", "Montegrappa", "Movado", "Navitec", "NB Yaeger",
  "Nina Ricci", "Nubeo", "Officina Del Tempo", "Omega", "Oris", "Panerai",
  "Parmigiani", "Patek Philippe", "Paul Picot", "Perrelet", "Philip Stein",
  "Piaget", "Pierre Balmain", "Porsche Design", "Prada", "Quinting", "Rado",
  "Rolex", "Rama Swiss Watch", "Raymond Weil", "Richard Mille", "Robergé",
  "Roberto Cavalli", "Rochas", "Roger Dubuis", "S.T. Dupont", "Saint Laurent Paris",
  "Salvatore Ferragamo", "SEIKO", "Swarovski", "Swatch", "Tag Heuer", "Techno Com",
  "Technomarine", "Tiffany & Co.", "Tissot", "Tonino Lamborghini", "Trussardi",
  "Tudor", "Vacheron Constantin", "Valentino", "Van Cleef & Arpels", "Versace",
  "Yves Saint Laurent", "Zenith", "Ingersoll", "IWC", "U-Boat", "Ulysse Nardin",
  "Other"
];

const InventoryStockSchema = new mongoose.Schema({
  productName: { 
    type: String,
    required: true,
    trim: true
  },

  brand: {
    type: String,
    enum: brandList,
  },

  internalCode: { type: String, trim: true, default: "" },
  quantity: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["AVAILABLE", "SOLD", "AUCTION"],
    default: "AVAILABLE"
  },

  cost: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  soldPrice: { type: Number, default: 0 },

  paymentMethod: {
    type: String,
    enum: ["cash", "stripe", "tabby", "chrono", "bank_transfer", "other"],
    default: "cash"
  },

  receivingAmount: { type: Number, default: 0 },

    addedBy: { // Optional: track which admin added this
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },

}, { timestamps: true });

module.exports = {
  InventoryStock: mongoose.model("InventoryStock", InventoryStockSchema),
  brandList
};