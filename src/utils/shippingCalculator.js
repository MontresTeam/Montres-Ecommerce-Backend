// utils/shippingCalculator.js
const SHIPPING_RULES = {
  local: {
    threshold: 500,
    fee: 30,
  },
  gcc: {
    threshold: 1000,
    fee: 100,
  },
  worldwide: {
    threshold: 1500,
    fee: 150,
  },
};

/**
 * Determine region from country string.
 * Returns one of: 'local', 'gcc', 'worldwide'
 */
const getRegionFromCountry = (country = "") => {
  const lower = country.trim().toLowerCase();

  const UAE_ALIASES = ["united arab emirates", "uae", "dubai", "abudhabi"];
  const GCC = [
    "saudi arabia",
    "bahrain",
    "kuwait",
    "qatar",
    "oman",
    // add others if needed
  ];

  if (UAE_ALIASES.includes(lower)) return "local";
  if (GCC.includes(lower)) return "gcc";
  return "worldwide";
};

/**
 * Calculate shipping fee based on country (or region) and subtotal.
 * - Accepts either country string or explicit region.
 */
const calculateShippingFee = ({ country, region, subtotal = 0 }) => {
  const resolvedRegion = region ? region.toLowerCase() : getRegionFromCountry(country);

  const rule = SHIPPING_RULES[resolvedRegion] || SHIPPING_RULES.worldwide;
  const fee = subtotal >= rule.threshold ? 0 : rule.fee;

  return {
    shippingFee: fee,
    region: resolvedRegion,
    threshold: rule.threshold,
  };
};

module.exports = { calculateShippingFee, getRegionFromCountry };
