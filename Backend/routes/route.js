const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');
const messageController = require('../controllers/messageController');
const carController = require('../controllers/carController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

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

// ====== Contact messages ======
router.post('/api/messages', messageController.submitMessage);
router.get('/api/messages', jwtMiddleware, adminMiddleware, messageController.getMessages);
router.patch('/api/messages/:id/read', jwtMiddleware, adminMiddleware, messageController.markMessageRead);
router.delete('/api/messages/:id', jwtMiddleware, adminMiddleware, messageController.deleteMessage);

// ====== Booking routes (protected) ======
router.post('/api/bookings', jwtMiddleware, bookingController.addBooking);
router.get('/api/bookings', jwtMiddleware, adminMiddleware, bookingController.getBookings);
router.get('/api/bookings/:id', jwtMiddleware, adminMiddleware, bookingController.getBookingById);
router.put('/api/bookings/:id', jwtMiddleware, bookingController.updateBooking);
router.delete('/api/bookings/:id', jwtMiddleware, bookingController.deleteBooking);

// ====== Car fleet routes ======
router.get('/api/cars', carController.getCars);
router.post('/api/cars', jwtMiddleware, adminMiddleware, carController.addCar);
router.put('/api/cars/:id', jwtMiddleware, adminMiddleware, carController.updateCar);
router.delete('/api/cars/:id', jwtMiddleware, adminMiddleware, carController.deleteCar);

router.get('/api/test', (req, res) => {
  res.json({ message: 'API route working' });
});

module.exports = router;
