const Booking = require('../models/Booking');
const Driver = require('../models/Driver');

const BUFFER_MINUTES = Number(process.env.BOOKING_BUFFER_MINUTES) || 30;

const ACTIVE_STATUSES = [
  'CONFIRMED',
  'DRIVER_ASSIGNED',
  'DRIVER_ON_THE_WAY',
  'IN_PROGRESS',
  'confirmed',
];

function getBookingWindow(booking) {
  const start = new Date(
    booking.schedule?.pickupDateTime || booking.arrivalDateTime || booking.createdAt
  );

  let durationMinutes = booking.trip?.estimatedDurationMinutes || 120;

  if (booking.serviceType === 'HOURLY' || booking.serviceType === 'hourly') {
    const hours = booking.hourlyBooking?.hours || parseInt(booking.hours, 10) || 3;
    durationMinutes = hours * 60;
  }

  const end = new Date(start.getTime() + (durationMinutes + BUFFER_MINUTES) * 60000);
  return { start, end };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

async function isVehicleAvailable(vehicleCarId, vehicleName, pickupDateTime, excludeBookingId = null) {
  const start = new Date(pickupDateTime);
  const query = {
    bookingStatus: { $in: ACTIVE_STATUSES },
    $or: [
      { 'vehicle.carId': vehicleCarId },
      { vehicleName: vehicleName },
      { 'vehicle.name': vehicleName },
    ],
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const existing = await Booking.find(query);
  const endEstimate = new Date(start.getTime() + (180 + BUFFER_MINUTES) * 60000);

  for (const booking of existing) {
    const window = getBookingWindow(booking);
    if (overlaps(start, endEstimate, window.start, window.end)) {
      return { available: false, conflictBooking: booking.bookingNumber || booking._id };
    }
  }
  return { available: true };
}

async function isDriverAvailable(driverId, pickupDateTime, excludeBookingId = null) {
  const driver = await Driver.findById(driverId);
  if (!driver || !driver.active) {
    return { available: false, reason: 'Driver not found or inactive' };
  }
  if (driver.status === 'OFFLINE') {
    return { available: false, reason: 'Driver is offline' };
  }

  const start = new Date(pickupDateTime);
  const query = {
    driver: driverId,
    bookingStatus: { $in: ACTIVE_STATUSES },
  };
  if (excludeBookingId) query._id = { $ne: excludeBookingId };

  const existing = await Booking.find(query);
  const endEstimate = new Date(start.getTime() + (180 + BUFFER_MINUTES) * 60000);

  for (const booking of existing) {
    const window = getBookingWindow(booking);
    if (overlaps(start, endEstimate, window.start, window.end)) {
      return { available: false, reason: 'Driver has overlapping booking', conflictBooking: booking.bookingNumber };
    }
  }
  return { available: true };
}

module.exports = {
  isVehicleAvailable,
  isDriverAvailable,
  getBookingWindow,
  BUFFER_MINUTES,
};
