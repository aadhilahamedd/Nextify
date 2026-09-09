const Car = require('../models/Car');
const Driver = require('../models/Driver');
const Settings = require('../models/Settings');
const { seedApprovedPricing } = require('../seed/pricingSeed');

const DEFAULT_CONTACT = {
  phone: '+966 11 234 5678',
  email: 'hello@nextify.sa',
  location: 'Riyadh, Saudi Arabia',
  whatsapp: '+966512345678',
};

const SAMPLE_DRIVERS = [
  { name: 'Ahmed Al-Rashid', phone: '+966501234567', email: 'ahmed.driver@nextify.sa', licenseNumber: 'SA-DL-10001', languages: ['Arabic', 'English'], status: 'AVAILABLE' },
  { name: 'Mohammed Al-Farsi', phone: '+966502345678', email: 'mohammed.driver@nextify.sa', licenseNumber: 'SA-DL-10002', languages: ['Arabic', 'English', 'Urdu'], status: 'AVAILABLE' },
];

async function seedDefaults() {
  await seedApprovedPricing();

  const driverCount = await Driver.countDocuments();
  if (driverCount === 0) {
    await Driver.insertMany(SAMPLE_DRIVERS.map((d) => ({ ...d, active: true })));
    console.log('✅ Seeded sample drivers');
  }

  const contactSetting = await Settings.findOne({ key: 'contact' });
  if (!contactSetting) {
    await Settings.create({ key: 'contact', value: DEFAULT_CONTACT });
    console.log('✅ Seeded contact settings');
  }

  // Update car display prices to SAR
  const cars = await Car.find({});
  for (const car of cars) {
    if (car.price && car.price.startsWith('$')) {
      const numeric = parseInt(car.price.replace(/\D/g, ''), 10) || 200;
      const sarPrice = Math.round(numeric * 3.75);
      car.price = `${sarPrice} SAR/day`;
      await car.save();
    }
  }
}

module.exports = { seedDefaults, DEFAULT_CONTACT };
