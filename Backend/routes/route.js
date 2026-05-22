const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

// ====== Auth routes (public) ======
router.post('/api/register', authController.register);
router.post('/api/user/login', authController.userLogin);
router.post('/api/admin/login', authController.adminLogin);
router.get('/api/contact', (req, res) => {
  res.json({
    contact: {
      phone: '+1 234 567 8900',
      email: 'hello@nextify.com',
      location: 'Los Angeles, CA'
    }
  });
});

// ====== Booking routes (protected) ======
router.post('/api/bookings', jwtMiddleware, bookingController.addBooking);
router.get('/api/bookings', jwtMiddleware, bookingController.getBookings);
router.get('/api/bookings/:id', jwtMiddleware, bookingController.getBookingById);
router.put('/api/bookings/:id', jwtMiddleware, bookingController.updateBooking);
router.delete('/api/bookings/:id', jwtMiddleware, bookingController.deleteBooking);

module.exports = router;
