const { samePlace } = require('../utils/vehicleCategories');

const INTERCITY_VAT_PERCENT = 15;

/**
 * Approved fixed-price intercity routes (exact 4 directional routes).
 * All other intercity routes remain WhatsApp-assisted with no displayed price.
 */
const INTERCITY_FIXED_ROUTES = [
  { id: 'riyadh_bahrain', origin: 'Riyadh', destination: 'Bahrain', basePrice: 1600 },
  { id: 'bahrain_riyadh', origin: 'Bahrain', destination: 'Riyadh', basePrice: 1600 },
  { id: 'riyadh_dammam', origin: 'Riyadh', destination: 'Dammam', basePrice: 1000 },
  { id: 'dammam_riyadh', origin: 'Dammam', destination: 'Riyadh', basePrice: 1000 },
];

/**
 * Integer-halala VAT calculation to avoid floating-point rounding drift.
 */
function calculateVatBreakdown(basePriceSar, vatPercent = INTERCITY_VAT_PERCENT) {
  const baseHalalas = Math.round(Number(basePriceSar) * 100);
  const vatHalalas = Math.round((baseHalalas * Number(vatPercent)) / 100);
  const totalHalalas = baseHalalas + vatHalalas;
  return {
    basePrice: baseHalalas / 100,
    vatPercent: Number(vatPercent),
    vatAmount: vatHalalas / 100,
    totalAmount: totalHalalas / 100,
    taxIncluded: true,
  };
}

function matchIntercityFixedRoute(origin, destination) {
  if (!origin || !destination) return null;
  if (samePlace(origin, destination)) return null;
  return INTERCITY_FIXED_ROUTES.find(
    (route) => samePlace(route.origin, origin) && samePlace(route.destination, destination)
  ) || null;
}

function quoteIntercityFixedRoute(origin, destination, extra = {}) {
  const matched = matchIntercityFixedRoute(origin, destination);
  if (!matched) return null;
  const vat = calculateVatBreakdown(matched.basePrice, INTERCITY_VAT_PERCENT);
  return {
    success: true,
    serviceType: 'intercity_transfer',
    routeId: matched.id,
    origin: matched.origin,
    destination: matched.destination,
    originLabel: matched.origin,
    destinationLabel: matched.destination,
    currency: 'SAR',
    price: vat.totalAmount,
    basePrice: vat.basePrice,
    vatPercent: vat.vatPercent,
    vatAmount: vat.vatAmount,
    totalAmount: vat.totalAmount,
    taxIncluded: true,
    pricingType: 'intercity_fixed',
    pricingModel: 'intercity_fixed',
    pricingMode: 'fixed',
    customQuoteRequired: false,
    payable: true,
    quoteStatus: 'priced',
    message: null,
    ...extra,
  };
}

module.exports = {
  INTERCITY_VAT_PERCENT,
  INTERCITY_FIXED_ROUTES,
  calculateVatBreakdown,
  matchIntercityFixedRoute,
  quoteIntercityFixedRoute,
};
