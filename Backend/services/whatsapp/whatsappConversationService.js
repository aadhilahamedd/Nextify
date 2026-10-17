const WhatsAppSession = require('../../models/WhatsAppSession');
const { sendText, sendButtons, sendList } = require('./whatsappService');
const {
  SERVICE_LABELS,
  SERVICE_VEHICLE_OPTIONS,
  INTERCITY_ROUTES,
  GCC_ROUTES,
  quoteDraft,
  formatQuote,
  formatSummary,
  confirmSessionBooking,
} = require('./whatsappBookingService');
const { createOrReuseCheckout } = require('../paymentService');
const Booking = require('../../models/Booking');
const { DEFAULT_CONTACT } = require('../seedService');

const AIRPORTS = ['Riyadh', 'Jeddah', 'Dammam'];
const SERVICES = Object.keys(SERVICE_LABELS);

function emptyDraft() {
  return {
    serviceType: '',
    airport: '',
    origin: '',
    destination: '',
    vehicleCategory: '',
    vehicleName: '',
    durationType: '',
    date: '',
    time: '',
    passengers: 1,
    luggage: 0,
    distanceKm: null,
    customerName: '',
    customerEmail: '',
    customerMobile: '',
    specialRequests: '',
    price: null,
    currency: 'SAR',
    customQuoteRequired: false,
    quoteMessage: '',
  };
}

async function getSession(phoneNumber, profileName) {
  let session = await WhatsAppSession.findOne({ phoneNumber });
  if (!session) {
    session = await WhatsAppSession.create({
      phoneNumber,
      currentStep: 'WELCOME',
      bookingDraft: { ...emptyDraft(), customerName: profileName || '', customerMobile: phoneNumber },
      status: 'ACTIVE',
    });
  }
  session.lastMessageAt = new Date();
  if (!session.bookingDraft.customerMobile) session.bookingDraft.customerMobile = phoneNumber;
  return session;
}

function pushStep(session, next) {
  if (session.currentStep && session.currentStep !== next) {
    session.stepHistory = [...(session.stepHistory || []), session.currentStep].slice(-20);
  }
  session.currentStep = next;
}

async function sendWelcome(to) {
  return sendList(
    to,
    'Welcome to Nextify 👋\n\nLuxury chauffeur booking in Saudi Arabia.\nHow can we help you?\n\nType help, back, restart, or cancel at any time.',
    'View services',
    SERVICES.map((id) => ({ id: `svc:${id}`, title: SERVICE_LABELS[id], description: 'Professional chauffeur included' })),
    'Services'
  );
}

async function sendVehicles(to, serviceType) {
  const vehicles = SERVICE_VEHICLE_OPTIONS[serviceType] || [];
  return sendList(
    to,
    'Choose your vehicle. Every option includes a professional chauffeur.',
    'View vehicles',
    vehicles.map((v) => ({ id: `veh:${v.category}`, title: v.label, description: 'Chauffeur included' })),
    'Vehicles'
  );
}

function parseDate(text) {
  const raw = String(text || '').trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const eu = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (eu) return `${eu[3]}-${eu[2].padStart(2, '0')}-${eu[1].padStart(2, '0')}`;
  return '';
}

function parseTime(text) {
  const match = String(text || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23 || mm > 59) return '';
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

async function goToDate(session) {
  pushStep(session, 'DATE_SELECTION');
  await session.save();
  await sendText(session.phoneNumber, 'Enter travel date as YYYY-MM-DD (example: 2026-12-15).');
}

async function afterVehicle(session) {
  if (session.bookingDraft.serviceType === 'chauffeur') {
    pushStep(session, 'DURATION_SELECTION');
    await session.save();
    await sendButtons(session.phoneNumber, 'How long do you need the chauffeur?', [
      { id: 'dur:half_day', title: 'Half Day' },
      { id: 'dur:full_day', title: 'Full Day' },
    ]);
    return;
  }
  await goToDate(session);
}

async function promptPassengers(session) {
  pushStep(session, 'PASSENGER_SELECTION');
  await session.save();
  await sendButtons(session.phoneNumber, 'How many passengers?', [
    { id: 'pax:1', title: '1 passenger' },
    { id: 'pax:2', title: '2 passengers' },
    { id: 'pax:more', title: '3 or more' },
  ]);
}

async function showConfirmation(session) {
  const quote = await quoteDraft(session.bookingDraft);
  session.bookingDraft.price = quote.price;
  session.bookingDraft.currency = quote.currency || 'SAR';
  session.bookingDraft.customQuoteRequired = Boolean(quote.customQuoteRequired);
  session.bookingDraft.quoteMessage = quote.message || '';
  pushStep(session, 'CONFIRMATION');
  await session.save();
  await sendButtons(
    session.phoneNumber,
    `${formatSummary(session.bookingDraft, quote)}\n\nShall we create this booking?`,
    [
      { id: 'confirm:yes', title: 'Confirm booking' },
      { id: 'confirm:no', title: 'Change details' },
      { id: 'cancel:ask', title: 'Cancel' },
    ]
  );
}

async function handleCommand(session, command) {
  if (command === 'help') {
    await sendText(
      session.phoneNumber,
      `Nextify support\n\nWhatsApp: ${DEFAULT_CONTACT.whatsapp}\nPhone: ${DEFAULT_CONTACT.phone}\nEmail: ${DEFAULT_CONTACT.email}\n\nCommands:\nhelp — this message\nback — previous step\nrestart — start over\ncancel — cancel this draft`
    );
    if (session.currentStep === 'WELCOME' || session.currentStep === 'SERVICE_SELECTION') {
      await sendWelcome(session.phoneNumber);
    }
    return true;
  }

  if (command === 'restart') {
    session.bookingDraft = emptyDraft();
    session.bookingDraft.customerMobile = session.phoneNumber;
    session.stepHistory = [];
    session.bookingId = null;
    session.paymentId = null;
    session.status = 'ACTIVE';
    pushStep(session, 'SERVICE_SELECTION');
    await session.save();
    await sendWelcome(session.phoneNumber);
    return true;
  }

  if (command === 'cancel') {
    pushStep(session, 'CONFIRM_CANCEL');
    await session.save();
    await sendButtons(session.phoneNumber, 'Cancel this WhatsApp booking draft?', [
      { id: 'cancel:yes', title: 'Yes, cancel' },
      { id: 'cancel:no', title: 'Keep going' },
    ]);
    return true;
  }

  if (command === 'back') {
    const prev = (session.stepHistory || []).pop();
    if (!prev || prev === 'WELCOME') {
      session.currentStep = 'SERVICE_SELECTION';
      await session.save();
      await sendWelcome(session.phoneNumber);
      return true;
    }
    session.currentStep = prev;
    await session.save();
    await replayStep(session);
    return true;
  }

  return false;
}

async function replayStep(session) {
  const step = session.currentStep;
  const draft = session.bookingDraft;
  if (step === 'SERVICE_SELECTION' || step === 'WELCOME') return sendWelcome(session.phoneNumber);
  if (step === 'AIRPORT_SELECTION') {
    return sendButtons(session.phoneNumber, 'Select your airport.', AIRPORTS.map((a) => ({ id: `apt:${a}`, title: a })));
  }
  if (step === 'DESTINATION_TEXT') return sendText(session.phoneNumber, 'Type your destination (hotel, home, or area).');
  if (step === 'CITY_ORIGIN') return sendText(session.phoneNumber, 'Type your pickup address in Riyadh.');
  if (step === 'CITY_DESTINATION') return sendText(session.phoneNumber, 'Type your drop-off address.');
  if (step === 'CITY_DISTANCE') return sendText(session.phoneNumber, 'Estimated distance in KM (0–20). Type skip if unknown.');
  if (step === 'ROUTE_SELECTION') {
    return sendButtons(session.phoneNumber, 'Select an intercity route.', INTERCITY_ROUTES.map((r) => ({ id: `route:${r.id}`, title: r.destination })));
  }
  if (step === 'GCC_SELECTION') {
    return sendList(session.phoneNumber, 'Select a GCC destination.', 'View destinations', GCC_ROUTES.map((g) => ({ id: `gcc:${g.id}`, title: g.label })));
  }
  if (step === 'VEHICLE_SELECTION') return sendVehicles(session.phoneNumber, draft.serviceType);
  if (step === 'DURATION_SELECTION') {
    return sendButtons(session.phoneNumber, 'How long do you need the chauffeur?', [
      { id: 'dur:half_day', title: 'Half Day' },
      { id: 'dur:full_day', title: 'Full Day' },
    ]);
  }
  if (step === 'DATE_SELECTION') return sendText(session.phoneNumber, 'Enter travel date as YYYY-MM-DD.');
  if (step === 'TIME_SELECTION') return sendText(session.phoneNumber, 'Enter pickup time as HH:MM (24-hour).');
  if (step === 'PASSENGER_SELECTION') return promptPassengers(session);
  if (step === 'LUGGAGE_SELECTION') {
    return sendButtons(session.phoneNumber, 'How many bags?', [
      { id: 'bag:0', title: '0 bags' },
      { id: 'bag:1', title: '1 bag' },
      { id: 'bag:more', title: '2 or more' },
    ]);
  }
  if (step === 'CUSTOMER_NAME') return sendText(session.phoneNumber, 'What is your full name?');
  if (step === 'CUSTOMER_EMAIL') return sendText(session.phoneNumber, 'What is your email address?');
  if (step === 'SPECIAL_REQUESTS') return sendText(session.phoneNumber, 'Any special request? Type skip if none.');
  if (step === 'CONFIRMATION') return showConfirmation(session);
  if (step === 'PAYMENT') return sendText(session.phoneNumber, 'Your booking is waiting for payment. Type retry to receive the payment link again.');
  return sendWelcome(session.phoneNumber);
}

async function handleIncoming({ from, name, text, buttonId }) {
  const session = await getSession(from, name);
  const incoming = (buttonId || text || '').trim();
  const command = incoming.toLowerCase();

  if (['help', 'restart', 'cancel', 'back'].includes(command)) {
    await handleCommand(session, command);
    return;
  }

  if (incoming === 'cancel:ask') {
    await handleCommand(session, 'cancel');
    return;
  }

  if (session.currentStep === 'CONFIRM_CANCEL') {
    if (incoming === 'cancel:yes' || command === 'yes') {
      session.status = 'CANCELLED';
      session.currentStep = 'CANCELLED';
      session.bookingDraft = emptyDraft();
      await session.save();
      await sendText(session.phoneNumber, 'This WhatsApp booking draft was cancelled. Type hello to start again.');
      return;
    }
    session.currentStep = (session.stepHistory || []).pop() || 'SERVICE_SELECTION';
    await session.save();
    await replayStep(session);
    return;
  }

  if (incoming.startsWith('svc:')) {
    session.bookingDraft.serviceType = incoming.slice(4);
    session.status = 'ACTIVE';
    if (session.bookingDraft.serviceType === 'airport_transfer') {
      pushStep(session, 'AIRPORT_SELECTION');
      await session.save();
      await sendButtons(session.phoneNumber, 'Select your airport.', AIRPORTS.map((a) => ({ id: `apt:${a}`, title: a })));
      return;
    }
    if (session.bookingDraft.serviceType === 'city_transfer') {
      pushStep(session, 'CITY_ORIGIN');
      await session.save();
      await sendText(session.phoneNumber, 'Type your pickup address in Riyadh.');
      return;
    }
    if (session.bookingDraft.serviceType === 'intercity_transfer') {
      pushStep(session, 'ROUTE_SELECTION');
      await session.save();
      await sendButtons(session.phoneNumber, 'Select an intercity route.', INTERCITY_ROUTES.map((r) => ({ id: `route:${r.id}`, title: r.destination })));
      return;
    }
    if (session.bookingDraft.serviceType === 'gcc_transfer') {
      pushStep(session, 'GCC_SELECTION');
      await session.save();
      await sendList(session.phoneNumber, 'Select a GCC destination.', 'View destinations', GCC_ROUTES.map((g) => ({ id: `gcc:${g.id}`, title: g.label })));
      return;
    }
    pushStep(session, 'VEHICLE_SELECTION');
    await session.save();
    await sendVehicles(session.phoneNumber, session.bookingDraft.serviceType);
    return;
  }

  if (incoming.startsWith('apt:')) {
    session.bookingDraft.airport = incoming.slice(4);
    pushStep(session, 'DESTINATION_TEXT');
    await session.save();
    await sendText(session.phoneNumber, 'Type your destination (hotel, home, or area).');
    return;
  }

  if (incoming.startsWith('route:')) {
    const route = INTERCITY_ROUTES.find((r) => r.id === incoming.slice(6));
    if (route) {
      session.bookingDraft.origin = route.origin;
      session.bookingDraft.destination = route.destination;
    }
    pushStep(session, 'VEHICLE_SELECTION');
    await session.save();
    await sendVehicles(session.phoneNumber, 'intercity_transfer');
    return;
  }

  if (incoming.startsWith('gcc:')) {
    const dest = GCC_ROUTES.find((g) => g.id === incoming.slice(4));
    if (dest) {
      session.bookingDraft.origin = 'Riyadh';
      session.bookingDraft.destination = dest.destination;
    }
    pushStep(session, 'VEHICLE_SELECTION');
    await session.save();
    await sendVehicles(session.phoneNumber, 'gcc_transfer');
    return;
  }

  if (incoming.startsWith('veh:')) {
    const category = incoming.slice(4);
    const vehicle = (SERVICE_VEHICLE_OPTIONS[session.bookingDraft.serviceType] || []).find((v) => v.category === category);
    session.bookingDraft.vehicleCategory = category;
    session.bookingDraft.vehicleName = vehicle?.label || category;
    await afterVehicle(session);
    return;
  }

  if (incoming.startsWith('dur:')) {
    session.bookingDraft.durationType = incoming.slice(4);
    await goToDate(session);
    return;
  }

  if (incoming.startsWith('pax:')) {
    if (incoming === 'pax:more') {
      pushStep(session, 'PASSENGER_TEXT');
      await session.save();
      await sendText(session.phoneNumber, 'Type the number of passengers.');
      return;
    }
    session.bookingDraft.passengers = Number(incoming.slice(4));
    if (session.bookingDraft.serviceType === 'chauffeur') {
      pushStep(session, 'CUSTOMER_NAME');
      await session.save();
      await sendText(session.phoneNumber, 'What is your full name?');
      return;
    }
    pushStep(session, 'LUGGAGE_SELECTION');
    await session.save();
    await sendButtons(session.phoneNumber, 'How many bags?', [
      { id: 'bag:0', title: '0 bags' },
      { id: 'bag:1', title: '1 bag' },
      { id: 'bag:more', title: '2 or more' },
    ]);
    return;
  }

  if (incoming.startsWith('bag:')) {
    if (incoming === 'bag:more') {
      pushStep(session, 'LUGGAGE_TEXT');
      await session.save();
      await sendText(session.phoneNumber, 'Type the number of bags.');
      return;
    }
    session.bookingDraft.luggage = Number(incoming.slice(4));
    pushStep(session, 'CUSTOMER_NAME');
    await session.save();
    await sendText(session.phoneNumber, 'What is your full name?');
    return;
  }

  if (incoming === 'confirm:yes') {
    try {
      const result = await confirmSessionBooking(session);
      if (result.quote.customQuoteRequired) {
        await sendText(session.phoneNumber, `Quote request submitted.\nBooking ID: ${result.booking.bookingNumber}\n\n${result.quote.message || 'Our team will contact you with the final fare.'}`);
        return;
      }
      await sendText(
        session.phoneNumber,
        `Booking created.\nBooking ID: ${result.booking.bookingNumber}\nStatus: waiting for payment.\n\nPay securely here:\n${result.paymentUrl}\n\nYour booking is not confirmed until payment is verified.`
      );
    } catch (err) {
      await sendText(session.phoneNumber, err.message || 'Could not create this booking. Please try again or type restart.');
    }
    return;
  }

  if (incoming === 'confirm:no') {
    await handleCommand(session, 'back');
    return;
  }

  if (incoming === 'pay:retry' || command === 'retry') {
    if (!session.bookingId) {
      await sendText(session.phoneNumber, 'No booking is waiting for payment. Type restart to begin.');
      return;
    }
    const booking = await Booking.findById(session.bookingId);
    if (!booking) {
      await sendText(session.phoneNumber, 'That booking could not be found. Type restart to begin.');
      return;
    }
    if (booking.paymentStatus === 'PAID') {
      await sendText(session.phoneNumber, `This booking is already paid.\nBooking ID: ${booking.bookingNumber}`);
      return;
    }
    const checkout = await createOrReuseCheckout(booking);
    await sendText(session.phoneNumber, `Try payment again:\n${checkout.paymentUrl}`);
    return;
  }

  if (incoming === 'pay:cancel') {
    await handleCommand(session, 'cancel');
    return;
  }

  switch (session.currentStep) {
    case 'WELCOME':
    case 'SERVICE_SELECTION':
    case 'CANCELLED':
    case 'COMPLETED':
      session.currentStep = 'SERVICE_SELECTION';
      session.status = 'ACTIVE';
      await session.save();
      await sendWelcome(session.phoneNumber);
      return;
    case 'DESTINATION_TEXT':
      session.bookingDraft.destination = incoming;
      pushStep(session, 'VEHICLE_SELECTION');
      await session.save();
      await sendVehicles(session.phoneNumber, session.bookingDraft.serviceType);
      return;
    case 'CITY_ORIGIN':
      session.bookingDraft.origin = incoming;
      pushStep(session, 'CITY_DESTINATION');
      await session.save();
      await sendText(session.phoneNumber, 'Type your drop-off address.');
      return;
    case 'CITY_DESTINATION':
      session.bookingDraft.destination = incoming;
      pushStep(session, 'CITY_DISTANCE');
      await session.save();
      await sendText(session.phoneNumber, 'Estimated distance in KM (0–20). Type skip if unknown.');
      return;
    case 'CITY_DISTANCE':
      if (command !== 'skip') {
        const km = Number(incoming);
        if (!Number.isFinite(km) || km < 0) {
          await sendText(session.phoneNumber, 'Please send a number, or type skip.');
          return;
        }
        session.bookingDraft.distanceKm = km;
      }
      pushStep(session, 'VEHICLE_SELECTION');
      await session.save();
      await sendVehicles(session.phoneNumber, 'city_transfer');
      return;
    case 'DATE_SELECTION': {
      const date = parseDate(incoming);
      if (!date || new Date(`${date}T23:59:59`) < new Date()) {
        await sendText(session.phoneNumber, 'Please send a future date as YYYY-MM-DD.');
        return;
      }
      session.bookingDraft.date = date;
      pushStep(session, 'TIME_SELECTION');
      await session.save();
      await sendText(session.phoneNumber, 'Enter pickup time as HH:MM (24-hour), for example 14:30.');
      return;
    }
    case 'TIME_SELECTION': {
      const time = parseTime(incoming);
      if (!time) {
        await sendText(session.phoneNumber, 'Please send time as HH:MM, for example 09:30.');
        return;
      }
      session.bookingDraft.time = time;
      await promptPassengers(session);
      return;
    }
    case 'PASSENGER_TEXT': {
      const count = Number(incoming);
      if (!Number.isInteger(count) || count < 1 || count > 14) {
        await sendText(session.phoneNumber, 'Please send a passenger count between 1 and 14.');
        return;
      }
      session.bookingDraft.passengers = count;
      if (session.bookingDraft.serviceType === 'chauffeur') {
        pushStep(session, 'CUSTOMER_NAME');
        await session.save();
        await sendText(session.phoneNumber, 'What is your full name?');
        return;
      }
      pushStep(session, 'LUGGAGE_SELECTION');
      await session.save();
      await sendButtons(session.phoneNumber, 'How many bags?', [
        { id: 'bag:0', title: '0 bags' },
        { id: 'bag:1', title: '1 bag' },
        { id: 'bag:more', title: '2 or more' },
      ]);
      return;
    }
    case 'LUGGAGE_TEXT': {
      const count = Number(incoming);
      if (!Number.isInteger(count) || count < 0 || count > 20) {
        await sendText(session.phoneNumber, 'Please send a bag count between 0 and 20.');
        return;
      }
      session.bookingDraft.luggage = count;
      pushStep(session, 'CUSTOMER_NAME');
      await session.save();
      await sendText(session.phoneNumber, 'What is your full name?');
      return;
    }
    case 'CUSTOMER_NAME':
      if (incoming.length < 2) {
        await sendText(session.phoneNumber, 'Please send your full name.');
        return;
      }
      session.bookingDraft.customerName = incoming;
      pushStep(session, 'CUSTOMER_EMAIL');
      await session.save();
      await sendText(session.phoneNumber, 'What is your email address?');
      return;
    case 'CUSTOMER_EMAIL':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(incoming)) {
        await sendText(session.phoneNumber, 'Please send a valid email address.');
        return;
      }
      session.bookingDraft.customerEmail = incoming;
      pushStep(session, 'SPECIAL_REQUESTS');
      await session.save();
      await sendText(session.phoneNumber, 'Any special request for the chauffeur? Type skip if none.');
      return;
    case 'SPECIAL_REQUESTS':
      session.bookingDraft.specialRequests = command === 'skip' ? '' : incoming;
      await showConfirmation(session);
      return;
    case 'PAYMENT':
      await sendText(session.phoneNumber, 'Type retry to receive the payment link again, or cancel to stop.');
      return;
    default:
      await sendText(session.phoneNumber, 'I did not understand that. Type help, back, restart, or choose one of the options.');
      await replayStep(session);
  }
}

module.exports = { handleIncoming };
