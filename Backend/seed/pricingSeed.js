const PricingRule = require('../models/PricingRule');
const Settings = require('../models/Settings');

const PRICING_VERSION = 6;
const AIRPORTS = ['Riyadh', 'Jeddah', 'Dammam'];

const FLEET = [
  { category: 'gmc', label: 'GMC', names: ['GMC', 'GMC Yukon', 'GMC Tahoe', 'Chevrolet Suburban'], airport: 240, city: 140, half: 800, full: 1400, intercity: 'gmc', gcc: true },
  { category: 'bmw_5', label: 'BMW 5 Series', names: ['BMW 5 Series'], airport: 800, city: null, half: null, full: 2800 },
  { category: 'bmw_7', label: 'BMW 7 Series', names: ['BMW 7 Series'], airport: 1000, city: null, half: null, full: 3000 },
  { category: 'ford_taurus', label: 'Ford Taurus', names: ['Ford Taurus'], airport: 180, city: 120, half: 700, full: 1200, intercity: 'sedan' },
  { category: 'lexus_es', label: 'Lexus ES 350', names: ['Lexus ES 350'], airport: 180, city: 120, half: 700, full: 1200, intercity: 'sedan' },
  { category: 'mercedes_e', label: 'Mercedes-Benz E-Class', names: ['Mercedes-Benz E-Class'], airport: 1000, city: null, half: null, full: 3000 },
  { category: 'mercedes_s', label: 'Mercedes-Benz S-Class', names: ['Mercedes-Benz S-Class'], airport: 1000, city: null, half: null, full: 3000 },
  { category: 'mercedes_vito', label: 'Mercedes-Benz Vito', names: ['Mercedes-Benz Vito', 'Mercedes-Benz eVito Tourer'], airport: 900, city: null, half: null, full: 2200 },
  { category: 'mercedes_sprinter', label: 'Mercedes-Benz Sprinter', names: ['Mercedes-Benz Sprinter'], airport: 1200, city: null, half: null, full: 2800 },
  { category: 'mercedes_v_class', label: 'Mercedes-Benz V-Class', names: ['Mercedes-Benz V-Class', 'Mercedes V-Class'], airport: 1200, city: null, half: null, full: 2500 },
  { category: 'toyota_hiace', label: 'Toyota Hiace', names: ['Toyota Hiace'], airport: 600, city: null, half: 700, full: 1200 },
  { category: 'mercedes_coach', label: 'Mercedes-Benz Coach Bus', names: ['Mercedes-Benz Coach Bus'], airport: 1500, city: null, half: null, full: 3000, notes: 'Full-day rate may vary depending on destination.' },
  { category: 'toyota_coaster', label: 'Toyota Coaster', names: ['Toyota Coaster'], airport: 600, city: null, half: 800, full: 1500 },
];

const INTERCITY = {
  sedan: [
    { origin: 'Riyadh', destination: 'Khobar', price: 1000 },
    { origin: 'Riyadh', destination: 'Jubail', price: 900 },
    { origin: 'Riyadh', destination: 'Jeddah', price: 2200 },
  ],
  gmc: [
    { origin: 'Riyadh', destination: 'Khobar', price: 1400 },
    { origin: 'Riyadh', destination: 'Jubail', price: 1400 },
    { origin: 'Riyadh', destination: 'Jeddah', price: 3500 },
  ],
};

const GCC = [
  { destination: 'Dubai', price: 4800 },
  { destination: 'Abu Dhabi', price: 4000 },
  { destination: 'Bahrain', price: 1900 },
  { destination: 'Qatar', price: 3500 },
  { destination: 'Oman', price: 6800 },
];

const APPROVED_RATES = [];

for (const car of FLEET) {
  APPROVED_RATES.push({
    serviceType: 'airport_transfer',
    airports: AIRPORTS,
    vehicleCategory: car.category,
    vehicleNames: car.names,
    displayLabel: car.label,
    price: car.airport,
  });

  if (car.city != null) {
    APPROVED_RATES.push({
      serviceType: 'city_transfer',
      origin: 'Riyadh',
      routeType: 'fixed',
      maxDistanceKm: 20,
      vehicleCategory: car.category,
      vehicleNames: car.names,
      displayLabel: car.label,
      price: car.city,
      notes: 'Riyadh up to 20 KM',
    });
  }

  if (car.half != null) {
    APPROVED_RATES.push({
      serviceType: 'chauffeur',
      vehicleCategory: car.category,
      vehicleNames: car.names,
      durationType: 'half_day',
      displayLabel: `${car.label} – Half Day`,
      price: car.half,
    });
  }

  APPROVED_RATES.push({
    serviceType: 'chauffeur',
    vehicleCategory: car.category,
    vehicleNames: car.names,
    durationType: 'full_day',
    displayLabel: `${car.label} – Full Day`,
    price: car.full,
    notes: car.notes || '',
  });

  if (car.intercity && INTERCITY[car.intercity]) {
    for (const route of INTERCITY[car.intercity]) {
      APPROVED_RATES.push({
        serviceType: 'intercity_transfer',
        origin: route.origin,
        destination: route.destination,
        vehicleCategory: car.category,
        vehicleNames: car.names,
        displayLabel: `Riyadh ↔ ${route.destination} – ${car.label}`,
        price: route.price,
      });
    }
  }
}

for (const route of GCC) {
  APPROVED_RATES.push({
    serviceType: 'gcc_transfer',
    origin: 'Riyadh',
    destination: route.destination,
    allowedVehicleCategories: ['gmc', 'gmc_yukon', 'gmc_tahoe', 'chevrolet_suburban'],
    vehicleCategory: 'gmc',
    vehicleNames: ['GMC', 'GMC Yukon', 'GMC Tahoe', 'Chevrolet Suburban'],
    displayLabel: `Riyadh → ${route.destination}`,
    price: route.price,
  });
}

const NORMALIZED_RATES = APPROVED_RATES.map((r) => ({
  ...r,
  currency: 'SAR',
  active: true,
  routeType: r.routeType || 'fixed',
}));

async function seedApprovedPricing() {
  const versionDoc = await Settings.findOne({ key: 'pricingVersion' });
  const count = await PricingRule.countDocuments({ active: true });
  const storedVersion = Number(versionDoc?.value || 0);
  if (storedVersion > PRICING_VERSION) {
    return { seeded: false, count };
  }
  if (storedVersion === PRICING_VERSION && count === NORMALIZED_RATES.length) {
    return { seeded: false, count };
  }

  await PricingRule.deleteMany({});
  await PricingRule.insertMany(NORMALIZED_RATES);
  await Settings.findOneAndUpdate(
    { key: 'pricingVersion' },
    { value: PRICING_VERSION },
    { upsert: true }
  );

  console.log(`✅ Seeded ${NORMALIZED_RATES.length} approved pricing rules (v${PRICING_VERSION})`);
  return { seeded: true, count: NORMALIZED_RATES.length };
}

module.exports = { seedApprovedPricing, APPROVED_RATES: NORMALIZED_RATES, PRICING_VERSION };
