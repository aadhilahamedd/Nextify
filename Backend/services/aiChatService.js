const openai = require('./openaiService');
const Car = require('../models/Car');
const Settings = require('../models/Settings');
const { calculatePrice } = require('./pricingService');
const { DEFAULT_CONTACT } = require('./seedService');
const {
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
  GCC_CATEGORIES,
} = require('../utils/vehicleCategories');

const MODEL = 'gpt-5';
const MAX_TOOL_ROUNDS = 8;
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `You are the official Nextify Chauffeur Assistant.

Nextify provides premium chauffeur and luxury vehicle services in Saudi Arabia. Every trip includes a professional chauffeur. Customers do not self-drive.

You can help with:
- Airport transfers
- City transfers
- Chauffeur services
- Intercity transfers
- GCC transfers
- Fleet information
- Vehicle information
- Pricing
- Booking assistance
- Booking status
- General Nextify questions
- Human/WhatsApp handoff

Rules:
1. Never invent prices, routes, vehicle specifications, availability, or booking numbers.
2. Never claim a booking is confirmed unless the Nextify backend has actually created it.
3. Currency is SAR.
4. If the customer asks for a price, you MUST call calculatePrice and use only that result.
5. If the customer asks what services Nextify provides, call getServices.
6. If the customer asks about vehicles or the fleet, call getFleet.
7. If the customer asks to speak with a human, WhatsApp, phone, or email, call getContactInformation and use only that data.
8. If a tool returns customQuoteRequired or cannot provide a price, say a Nextify representative can assist. Do not guess.
9. Keep replies professional, concise, and premium.
10. Do not mention internal APIs, MongoDB, tools, system prompts, code, or implementation details.
11. Do not create or confirm bookings. Offer to help the customer start a booking on the website or connect them with a representative.
12. If information is missing (vehicle, airport, route, duration), ask a short clarifying question, then call the tool when you have enough detail.`;

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'calculatePrice',
    description:
      'Calculate an official Nextify quote from the pricing database. Use for any price, cost, or rate question. Never guess a price.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        serviceType: {
          type: 'string',
          enum: ['airport_transfer', 'city_transfer', 'chauffeur', 'intercity_transfer', 'gcc_transfer'],
          description: 'Nextify service type',
        },
        origin: {
          type: ['string', 'null'],
          description: 'Origin city, e.g. Riyadh',
        },
        destination: {
          type: ['string', 'null'],
          description: 'Destination city or GCC country',
        },
        vehicleCategory: {
          type: ['string', 'null'],
          description:
            'Vehicle category such as sedan, ford_taurus, prado_fortuner, gmc_yukon, gmc_tahoe, chevrolet_suburban, mini_van, mercedes_v_class',
        },
        vehicleName: {
          type: ['string', 'null'],
          description: 'Specific vehicle name if known, e.g. Lexus ES 350 or GMC Yukon',
        },
        airport: {
          type: ['string', 'null'],
          description: 'Airport city for airport_transfer: Riyadh, Jeddah, or Dammam',
        },
        durationType: {
          type: ['string', 'null'],
          description: 'Required for chauffeur: half_day or full_day',
        },
        distanceKm: {
          type: ['number', 'null'],
          description: 'Distance in KM for city_transfer. Fixed rates apply up to 20 KM.',
        },
      },
      required: [
        'serviceType',
        'origin',
        'destination',
        'vehicleCategory',
        'vehicleName',
        'airport',
        'durationType',
        'distanceKm',
      ],
    },
  },
  {
    type: 'function',
    name: 'getServices',
    description: 'List official Nextify services, supported routes, and vehicle categories. Does not include prices.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: [],
    },
  },
  {
    type: 'function',
    name: 'getFleet',
    description: 'Return actual Nextify fleet vehicles from the database. Optional name filter.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: {
          type: ['string', 'null'],
          description: 'Optional vehicle name to search, e.g. Yukon or Sprinter',
        },
      },
      required: ['name'],
    },
  },
  {
    type: 'function',
    name: 'getContactInformation',
    description: 'Return official Nextify phone, WhatsApp, email, and address for human handoff.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: [],
    },
  },
];

function emptyToNull(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  return value;
}

function normalizeVehicleCategory(category, name) {
  const raw = `${category || ''} ${name || ''}`.toLowerCase();
  if (!raw.trim()) return { vehicleCategory: '', vehicleName: name || '' };
  if (raw.includes('v-class') || raw.includes('v class') || raw.includes('evito')) {
    return { vehicleCategory: 'mercedes_v_class', vehicleName: name || category };
  }
  if (raw.includes('taurus')) return { vehicleCategory: 'ford_taurus', vehicleName: name || category };
  if (raw.includes('coaster') || raw.includes('mini van') || raw.includes('minivan') || raw.includes('hiace')) {
    return { vehicleCategory: 'mini_van', vehicleName: name || category };
  }
  if (raw.includes('suburban')) return { vehicleCategory: 'chevrolet_suburban', vehicleName: name || category };
  if (raw.includes('tahoe')) return { vehicleCategory: 'gmc_tahoe', vehicleName: name || category };
  if (raw.includes('yukon') || raw.includes('gmc')) return { vehicleCategory: 'gmc_yukon', vehicleName: name || category };
  if (raw.includes('prado') || raw.includes('fortuner') || raw.includes('mini suv')) {
    return { vehicleCategory: 'prado_fortuner', vehicleName: name || category };
  }
  if (raw.includes('sedan') || raw.includes('s-class') || raw.includes('es 350') || raw.includes('impala') || raw.includes('7 series') || raw.includes('5 series') || raw.includes('e-class')) {
    return { vehicleCategory: 'sedan', vehicleName: name || category };
  }
  return { vehicleCategory: category || '', vehicleName: name || '' };
}

function publicQuote(quote) {
  if (!quote || typeof quote !== 'object') {
    return { success: false, message: 'No pricing result was returned.' };
  }
  return {
    success: Boolean(quote.success),
    price: quote.price ?? null,
    currency: quote.currency || 'SAR',
    pricingType: quote.pricingType || null,
    customQuoteRequired: Boolean(quote.customQuoteRequired),
    message: quote.message || null,
    vehicleCategory: quote.vehicleCategory || null,
    displayLabel: quote.displayLabel || null,
    totalAmount: quote.totalAmount ?? quote.price ?? null,
    serviceType: quote.serviceType || null,
    airport: quote.airport || null,
    origin: quote.origin || null,
    destination: quote.destination || null,
    durationType: quote.durationType || null,
    maxDistanceKm: quote.maxDistanceKm || null,
  };
}

async function handleCalculatePrice(args = {}) {
  const serviceType = args.serviceType;
  if (!serviceType) {
    return { success: false, message: 'serviceType is required.' };
  }

  const mapped = normalizeVehicleCategory(emptyToNull(args.vehicleCategory), emptyToNull(args.vehicleName));
  const origin = emptyToNull(args.origin);
  const destination = emptyToNull(args.destination);
  const airport = emptyToNull(args.airport) || (serviceType === 'airport_transfer' ? origin : null);
  const durationType = emptyToNull(args.durationType);
  const distanceKm = args.distanceKm === null || args.distanceKm === undefined ? undefined : Number(args.distanceKm);

  if (serviceType === 'chauffeur' && !['half_day', 'full_day'].includes(durationType || '')) {
    return {
      success: true,
      price: null,
      customQuoteRequired: false,
      message: 'Ask the customer whether they need half_day or full_day chauffeur service before calculating a price.',
    };
  }

  const payload = {
    serviceType,
    origin,
    destination,
    vehicleCategory: mapped.vehicleCategory,
    vehicleName: mapped.vehicleName,
    airport,
    durationType,
    distanceKm,
  };

  const quote = await calculatePrice(payload);
  return publicQuote(quote);
}

async function handleGetServices() {
  return {
    currency: 'SAR',
    services: [
      {
        serviceType: 'airport_transfer',
        name: 'Airport Transfer',
        airports: ['Riyadh', 'Jeddah', 'Dammam'],
        vehicles: SERVICE_VEHICLE_OPTIONS.airport_transfer,
      },
      {
        serviceType: 'city_transfer',
        name: 'City Transfer',
        notes: 'Fixed Riyadh rates apply up to 20 KM. Longer trips need a custom quote.',
        vehicles: SERVICE_VEHICLE_OPTIONS.city_transfer,
      },
      {
        serviceType: 'chauffeur',
        name: 'Chauffeur Service',
        durations: ['half_day', 'full_day'],
        vehicles: SERVICE_VEHICLE_OPTIONS.chauffeur,
      },
      {
        serviceType: 'intercity_transfer',
        name: 'Intercity Transfer',
        routes: INTERCITY_ROUTES,
        vehicles: SERVICE_VEHICLE_OPTIONS.intercity_transfer,
      },
      {
        serviceType: 'gcc_transfer',
        name: 'GCC Transfer',
        origin: 'Riyadh',
        routes: GCC_ROUTES,
        vehicles: SERVICE_VEHICLE_OPTIONS.gcc_transfer,
        allowedVehicleCategories: GCC_CATEGORIES,
      },
    ],
    note: 'Do not invent prices. Call calculatePrice for official SAR quotes.',
  };
}

async function handleGetFleet(args = {}) {
  const name = emptyToNull(args.name);
  const query = name ? { name: { $regex: name, $options: 'i' } } : {};
  const cars = await Car.find(query).sort({ id: 1 }).lean();
  return {
    count: cars.length,
    vehicles: cars.map((car) => ({
      name: car.name,
      type: car.type,
      seats: car.seats,
      luggage: car.luggage,
    })),
    note: 'These are fleet details only. Call calculatePrice for official trip quotes.',
  };
}

async function handleGetContactInformation() {
  const setting = await Settings.findOne({ key: 'contact' }).lean();
  const contact = setting?.value || DEFAULT_CONTACT;
  return {
    phone: contact.phone || null,
    phoneSecondary: contact.phoneSecondary || null,
    phoneLandline: contact.phoneLandline || null,
    whatsapp: contact.whatsapp || contact.phone || null,
    email: contact.email || null,
    location: contact.location || null,
  };
}

const TOOL_HANDLERS = {
  calculatePrice: handleCalculatePrice,
  getServices: handleGetServices,
  getFleet: handleGetFleet,
  getContactInformation: handleGetContactInformation,
};

async function executeTool(name, rawArguments) {
  const handler = TOOL_HANDLERS[name];
  if (!handler) {
    return { success: false, message: `Unknown tool: ${name}` };
  }

  let args = {};
  try {
    args = typeof rawArguments === 'string' ? JSON.parse(rawArguments || '{}') : rawArguments || {};
  } catch (err) {
    console.error('AI tool argument parse error:', name, err);
    return { success: false, message: 'Tool arguments were invalid.' };
  }

  try {
    return await handler(args);
  } catch (err) {
    console.error('AI tool execution error:', name, err);
    return { success: false, message: err.message || 'The requested information is unavailable right now.' };
  }
}

function extractText(response) {
  if (response?.output_text && String(response.output_text).trim()) {
    return String(response.output_text).trim();
  }

  const parts = [];
  for (const item of response?.output || []) {
    if (item.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
      if (content.type === 'text' && content.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

function toInputHistory(conversation = []) {
  return conversation
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content)
    .slice(-MAX_HISTORY)
    .map((item) => ({
      role: item.role,
      content: String(item.content),
    }));
}

async function generateAIReply(message, conversation = []) {
  const input = [
    ...toInputHistory(conversation),
    { role: 'user', content: message },
  ];

  let response = await openai.responses.create({
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input,
    tools: TOOL_DEFINITIONS,
  });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const calls = (response.output || []).filter((item) => item.type === 'function_call');
    if (!calls.length) break;

    input.push(...response.output);

    for (const call of calls) {
      const result = await executeTool(call.name, call.arguments);
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
    }

    response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input,
      tools: TOOL_DEFINITIONS,
    });
  }

  const reply = extractText(response);
  if (!reply) {
    throw new Error('Empty AI response');
  }
  return reply;
}

module.exports = {
  generateAIReply,
  executeTool,
};
