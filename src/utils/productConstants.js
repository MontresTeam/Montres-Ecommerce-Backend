const FUNCTION_CATEGORIES = {
  "Functions Set 1": [
    "Search", "Our suggestion", "Date Suggestion", "Moon phase", "Minute repeater",
    "Chronograph", "Double chronograph", "Flyback", "Panorama date", "Chiming clock",
    "Repeater", "Tourbillon", "Weekday", "Month", "Year", "Annual calendar",
    "4-year calendar", "Perpetual calendar"
  ],
  "Functions Set 2": [
    "Continuous hands", "Tempered blue hands", "Genevian Seal", "Chronometer",
    "Power Reserve Display", "Rotating Bezel", "Limited Edition", "Crown Left",
    "Screw-Down Crown", "Helium Valve", "Quick Set", "Screw-Down Push-Buttons",
    "Only Original Parts", "Luminous indices", "PVD/DLC coating", "World time watch",
    "Master Chronometer", "Smartwatch"
  ],
  "Functions Set 3": [
    "Solar watch", "One-hand watches", "Vintage"
  ],
  "Functions Set 4": [
    "Alarm", "GMT", "Equation of time", "Jumping hour", "Tachymeter"
  ]
};

const ALL_FUNCTIONS = [
  ...FUNCTION_CATEGORIES["Functions Set 1"],
  ...FUNCTION_CATEGORIES["Functions Set 2"],
  ...FUNCTION_CATEGORIES["Functions Set 3"],
  ...FUNCTION_CATEGORIES["Functions Set 4"]
];

const SCOPE_OF_DELIVERY_OPTIONS = [
  "Watch Only",
  "Watch with original box",
  "Watch with original papers",
  "Watch with original box and original papers",
  "Montres safe box"
];

const WATCH_TYPES = [
  "Luxury watch", "Classic watch", "Sports watch", "Vintage watch",
  "Dress watch", "Diver's watch", "Pilot watch", "Racing watch", "Smartwatch"
];

const GENDERS = ["Men/Unisex", "Women"];

const MOVEMENTS = [
  "Automatic", "Quartz", "Manual", "Solar", "Kinetic", "Mechanical"
];

const COLORS = [
  "Black", "White", "Gold/Silver", "Silver", "Gold", "Rose Gold", "Blue", "Green", "Red",
  "Brown", "Gray", "Yellow", "Orange", "Purple", "Pink", "Champagne"
];

const MATERIALS = [
 "Stainless Steel", "Gold/Steel", "Gold","Steel","Rose Gold", "Platinum", "Titanium", "Ceramic",
  "Carbon Fiber", "Brass", "Bronze", "Aluminum"
];

const DIALNUMERALS = [
    "Arabic Numerals",
    "Roman Numerals",
    "No Numerals",
    "Lines",
    "Gemstone",
    "Dot/round marker"
]

const STRAP_MATERIALS = [
  "Leather", "Metal Bracelet", "Gold","Steel", "Gold/Steel","Rubber", "Nylon", "Fabric", "Silicone",
  "Alligator", "Crocodile", "Suede", "Canvas"
];

const CRYSTALS = [
  "Sapphire", "Mineral", "Acrylic", "Hardlex", "Plexiglass"
];

const BEZEL_MATERIALS = [
   "Stainless Steel",
    "Ceramic",
    "Aluminum",
    "Gold",
    "18k yellowGold",
    "Titanium",
    "Gold Plated",
    "Rubber"
];


const CONDITIONS = [
    "New",
    "Like New",
    "Excellent",
    "Very Good",
    "Good",
    "Fair",
    "Poor",
];

const REPLACEMENT_PARTS = [
    "Dial",
    "Crown",
    "Clasp",
    "Leather strap",
    "Bezel",
    "Hands",
    "Pusher",
    "Crystal",
    "Coating",
    "Diamond finishing",
    "Metal bracelet",
    "Case back",
    "Movement replacement parts",
];

module.exports = {
  FUNCTION_CATEGORIES,
  ALL_FUNCTIONS,
  SCOPE_OF_DELIVERY_OPTIONS,
  WATCH_TYPES,
  GENDERS,
  MOVEMENTS,
  COLORS,
  MATERIALS,
  STRAP_MATERIALS,
  CRYSTALS,
  BEZEL_MATERIALS,
  CONDITIONS,
  REPLACEMENT_PARTS,
  DIALNUMERALS
};
