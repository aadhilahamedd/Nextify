// Legacy FAQ/intent helpers. /api/chat now uses aiChatService, not processMessage.
const Car = require('../models/Car');
const PricingRule = require('../models/PricingRule');
const { getRulesByService } = require('./pricingService');
const { SERVICE_VEHICLE_OPTIONS } = require('../utils/vehicleCategories');

const FAQ = [
  {
    keywords: ['driver', 'chauffeur', 'drive myself', 'self drive'],
    answer:
      'Yes — every Nextify booking includes a professional chauffeur. Customers do not drive the vehicles themselves. All trips are VEHICLE + PROFESSIONAL DRIVER.',
  },
  {
    keywords: ['payment', 'pay', 'card', 'mada'],
    answer:
      'We are preparing integration with Saudi payment gateways (PayTabs, HyperPay, Tap). Currently, bookings use a secure mock checkout for demo purposes.',
  },
  {
    keywords: ['track', 'status', 'booking number'],
    answer:
      'Use the Track Booking page with your booking number and email or mobile to view your reservation status.',
  },
];

function matchFAQ(message) {
  const lower = message.toLowerCase();
  for (const item of FAQ) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      return item.answer;
    }
  }
  return null;
}

function formatRuleLine(rule) {
  const label = rule.displayLabel || rule.vehicleCategory || rule.destination || 'Rate';
  return `• ${label} – SAR ${rule.price.toLocaleString()}`;
}

async function formatAirportPricing(airport = 'Riyadh') {
  const rules = await getRulesByService('airport_transfer');
  const lines = rules.map(formatRuleLine);
  return {
    reply: `Our ${airport} airport transfer starts from SAR ${Math.min(...rules.map((r) => r.price)).toLocaleString()} for a Sedan.\n\nAvailable vehicles:\n${lines.join('\n')}\n\nWould you like to book an airport transfer?`,
    mode: 'pricing',
  };
}

async function formatIntercityPricing(origin, destination) {
  const rules = await PricingRule.find({
    serviceType: 'intercity_transfer',
    active: true,
    origin,
    destination,
  }).sort({ price: 1 });

  if (!rules.length) {
    return {
      reply: 'This intercity route requires a custom quote. Please start a booking or contact us on WhatsApp.',
      mode: 'pricing',
    };
  }

  const lines = rules.map(formatRuleLine);
  return {
    reply: `${origin} ↔ ${destination} transfer:\n\n${lines.join('\n')}\n\nWould you like to make a booking?`,
    mode: 'pricing',
  };
}

async function formatGccPricing(destination) {
  const rule = await PricingRule.findOne({
    serviceType: 'gcc_transfer',
    active: true,
    destination: { $regex: new RegExp(destination, 'i') },
  });
  if (!rule) {
    return { reply: 'This GCC route requires a custom quote.', mode: 'pricing' };
  }
  const vehicles = SERVICE_VEHICLE_OPTIONS.gcc_transfer.map((v) => v.label).join(', ');
  return {
    reply: `Riyadh → ${rule.destination}: SAR ${rule.price.toLocaleString()}\n\nAvailable vehicles: ${vehicles}\n\nWould you like to book a GCC transfer?`,
    mode: 'pricing',
  };
}

async function formatChauffeurPricing() {
  const rules = await getRulesByService('chauffeur');
  const lines = rules.map((r) => {
    const dur = r.durationType === 'half_day' ? 'Half Day' : 'Full Day';
    return `• ${r.displayLabel || r.vehicleCategory} (${dur}) – SAR ${r.price.toLocaleString()}`;
  });
  return {
    reply: `Chauffeur service rates:\n\n${lines.join('\n')}\n\nWould you like to book chauffeur service?`,
    mode: 'pricing',
  };
}

async function getAvailableCars(passengerCount = 1) {
  const cars = await Car.find({}).sort({ id: 1 });
  return cars.filter((car) => {
    const seatsMatch = car.seats.match(/(\d+)/);
    const maxSeats = seatsMatch ? parseInt(seatsMatch[1], 10) : 4;
    return maxSeats >= passengerCount;
  });
}

async function processMessage(message, context = {}) {
  const faqAnswer = matchFAQ(message);
  if (faqAnswer) {
    return { reply: faqAnswer, mode: 'demo' };
  }

  const lower = message.toLowerCase();

  if (lower.includes('airport') || lower.match(/riyadh.*airport|jeddah.*airport|dammam.*airport/)) {
    let airport = 'Riyadh';
    if (lower.includes('jeddah')) airport = 'Jeddah';
    if (lower.includes('dammam')) airport = 'Dammam';
    return formatAirportPricing(airport);
  }

  if (lower.includes('jeddah') && (lower.includes('riyadh') || lower.includes('from') || lower.includes('to'))) {
    return formatIntercityPricing('Riyadh', 'Jeddah');
  }
  if (lower.includes('khobar') || lower.includes('al khobar')) {
    return formatIntercityPricing('Riyadh', 'Khobar');
  }
  if (lower.includes('jubail')) {
    return formatIntercityPricing('Riyadh', 'Jubail');
  }

  if (lower.includes('dubai')) return formatGccPricing('Dubai');
  if (lower.includes('abu dhabi')) return formatGccPricing('Abu Dhabi');
  if (lower.includes('bahrain')) return formatGccPricing('Bahrain');
  if (lower.includes('qatar')) return formatGccPricing('Qatar');
  if (lower.includes('oman')) return formatGccPricing('Oman');

  if (lower.includes('chauffeur') || lower.includes('half day') || lower.includes('full day')) {
    return formatChauffeurPricing();
  }

  if (lower.includes('city transfer') || lower.includes('within riyadh') || lower.includes('20 km')) {
    const rules = await getRulesByService('city_transfer');
    const lines = rules.map(formatRuleLine);
    return {
      reply: `Riyadh city transfer (up to 20 KM):\n\n${lines.join('\n')}\n\nTrips above 20 KM require a custom quote.`,
      mode: 'pricing',
    };
  }

  if (lower.includes('available car') || lower.includes('which car')) {
    const cars = await getAvailableCars(context.passengerCount || 1);
    const list = cars.slice(0, 5).map((c) => `• ${c.name} (${c.type})`).join('\n');
    return {
      reply: `Here are suitable vehicles:\n${list}\n\nVisit our Car List or start a booking for live pricing.`,
      mode: 'demo',
    };
  }

  if (lower.includes('price') || lower.includes('cost') || lower.includes('quote') || lower.includes('how much')) {
    return {
      reply:
        'I can help with airport transfers, city transfers, chauffeur service, intercity routes, and GCC transfers. Try asking e.g. "How much is Riyadh airport transfer?" or "Riyadh to Jeddah price".',
      mode: 'demo',
    };
  }

  return {
    reply:
      'Welcome to Nextify luxury chauffeur service in Saudi Arabia. Ask about airport transfers, chauffeur rates, intercity routes, or GCC transfers for live pricing from our rate sheet.',
    mode: 'demo',
  };
}

module.exports = { processMessage, getAvailableCars, FAQ };
