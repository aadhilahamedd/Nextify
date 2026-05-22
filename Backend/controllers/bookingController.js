const Booking = require('../models/Booking');

// Add booking
exports.addBooking = async (req, res) => {
  try {
    const { name, mobile, email, serviceType, flightNumber, arrivalDateTime, vehicle, pickupLocation, otherPickupLocation, dropoffLocation, hours } = req.body;

    // Validate required fields
    if (!name || !mobile || !email || !serviceType || !arrivalDateTime || !vehicle || !pickupLocation || !dropoffLocation) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    const newBooking = new Booking({
      name,
      mobile,
      email,
      serviceType,
      flightNumber: flightNumber || '',
      arrivalDateTime: new Date(arrivalDateTime),
      vehicle,
      pickupLocation,
      otherPickupLocation: otherPickupLocation || '',
      dropoffLocation,
      hours: hours || '5 HRS'
    });

    await newBooking.save();
    return res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Error creating booking', error: err.message });
  }
};

// Get all bookings
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();
    return res.status(200).json(bookings);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Error fetching bookings', error: err.message });
  }
};

// Get booking by ID
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    return res.status(200).json(booking);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Error fetching booking', error: err.message });
  }
};

// Update booking
exports.updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { name, mobile, email, serviceType, flightNumber, arrivalDateTime, vehicle, pickupLocation, otherPickupLocation, dropoffLocation, hours, bookingStatus } = req.body;

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        name,
        mobile,
        email,
        serviceType,
        flightNumber,
        arrivalDateTime: new Date(arrivalDateTime),
        vehicle,
        pickupLocation,
        otherPickupLocation,
        dropoffLocation,
        hours,
        bookingStatus,
        updatedAt: Date.now()
      },
      { new: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.status(200).json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Error updating booking', error: err.message });
  }
};

// Delete booking
exports.deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const deletedBooking = await Booking.findByIdAndDelete(bookingId);

    if (!deletedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    return res.status(200).json({
      message: 'Booking deleted successfully',
      booking: deletedBooking
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: 'Error deleting booking', error: err.message });
  }
};
