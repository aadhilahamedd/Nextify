const express = require('express');
const router = express.Router();
console.log("🔥 ROUTE.JS LOADED");

const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');
const messageController = require('../controllers/messageController');
const carController = require('../controllers/carController');
const pricingController = require('../controllers/pricingController');
const driverController = require('../controllers/driverController');
const paymentController = require('../controllers/paymentController');
const chatController = require('../controllers/chatController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const optionalJwtMiddleware = require('../middleware/optionalJwtMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const Settings = require('../models/Settings');
const { DEFAULT_CONTACT } = require('../services/seedService');
const { success } = require('../utils/apiResponse');
const openaiService = require('../services/openaiService');

// ====== Auth routes ======
router.post('/api/register', authController.register);
router.post('/api/auth/register', authController.register);
router.post('/api/user/login', authController.userLogin);
router.post('/api/auth/login', authController.userLogin);
router.post('/api/admin/login', authController.adminLogin);
router.get('/api/auth/me', jwtMiddleware, authController.getMe);

router.get('/api/contact', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'contact' });
    const contact = setting?.value || DEFAULT_CONTACT;
    return success(res, 200, 'Contact info', { contact });
  } catch {
    return success(res, 200, 'Contact info', { contact: DEFAULT_CONTACT });
  }
});

// ====== Contact messages ======
router.post('/api/messages', messageController.submitMessage);
router.get('/api/messages', jwtMiddleware, adminMiddleware, messageController.getMessages);
router.patch('/api/messages/:id/read', jwtMiddleware, adminMiddleware, messageController.markMessageRead);
router.delete('/api/messages/:id', jwtMiddleware, adminMiddleware, messageController.deleteMessage);

// ====== Pricing ======
router.post('/api/pricing/calculate', pricingController.calculatePrice);
router.get('/api/pricing/summary', pricingController.getPricingSummary);
router.get('/api/pricing', pricingController.getPricing);
router.get('/api/pricing/:id', pricingController.getPricingById);
router.post('/api/pricing', jwtMiddleware, adminMiddleware, pricingController.createPricingRule);
router.put('/api/pricing/:id', jwtMiddleware, adminMiddleware, pricingController.updatePricingRule);
router.delete('/api/pricing/:id', jwtMiddleware, adminMiddleware, pricingController.deletePricingRule);
router.get('/api/pricing-rules', jwtMiddleware, adminMiddleware, pricingController.getPricingRules);
router.post('/api/pricing-rules', jwtMiddleware, adminMiddleware, pricingController.createPricingRule);
router.put('/api/pricing-rules/:id', jwtMiddleware, adminMiddleware, pricingController.updatePricingRule);

// ====== Bookings (guest + optional auth) ======
router.post('/api/bookings', optionalJwtMiddleware, bookingController.createBooking);
router.get('/api/bookings/track/:bookingNumber', bookingController.trackBooking);
router.get('/api/bookings', jwtMiddleware, adminMiddleware, bookingController.getBookings);
router.get('/api/bookings/stats', jwtMiddleware, adminMiddleware, bookingController.getDashboardStats);
router.get('/api/bookings/:id', jwtMiddleware, adminMiddleware, bookingController.getBookingById);
router.put('/api/bookings/:id', jwtMiddleware, adminMiddleware, bookingController.updateBooking);
router.post('/api/bookings/:id/assign-driver', jwtMiddleware, adminMiddleware, bookingController.assignDriver);
router.delete('/api/bookings/:id', jwtMiddleware, adminMiddleware, bookingController.deleteBooking);

// ====== Cars ======
router.get('/api/cars', carController.getCars);
router.get('/api/cars/:id', carController.getCarById);
router.post('/api/cars', jwtMiddleware, adminMiddleware, carController.addCar);
router.put('/api/cars/:id', jwtMiddleware, adminMiddleware, carController.updateCar);
router.delete('/api/cars/:id', jwtMiddleware, adminMiddleware, carController.deleteCar);

// ====== Drivers ======
router.get('/api/drivers', jwtMiddleware, adminMiddleware, driverController.getDrivers);
router.post('/api/drivers', jwtMiddleware, adminMiddleware, driverController.createDriver);
router.put('/api/drivers/:id', jwtMiddleware, adminMiddleware, driverController.updateDriver);
router.delete('/api/drivers/:id', jwtMiddleware, adminMiddleware, driverController.deleteDriver);

// ====== Payments ======
router.post('/api/payments/create', optionalJwtMiddleware, paymentController.createPayment);
router.post('/api/payments/mock/complete', paymentController.mockComplete);
router.post('/api/payments/mock/fail', paymentController.mockFail);
router.post('/api/payments/moyasar/reference', optionalJwtMiddleware, paymentController.attachMoyasarReference);
router.get('/api/payments/verify/:id', optionalJwtMiddleware, paymentController.verifyPayment);
router.get('/api/payment/verify/:paymentId', optionalJwtMiddleware, paymentController.verifyPayment);
router.post('/api/payments/webhook', paymentController.webhook);
router.post('/api/payment/webhook', paymentController.webhook);
router.get('/api/payments/booking/:bookingId', jwtMiddleware, adminMiddleware, paymentController.getPaymentByBooking);
router.get('/api/payments', jwtMiddleware, adminMiddleware, paymentController.getAllPayments);

// ====== Chat ======
router.post('/api/chat', chatController.chat);

router.get('/api/test', (req, res) => {
  return success(res, 200, 'API route working', { ok: true });
});

router.get("/api/test-openai", async (req, res) => {
  try {
    const response = await openaiService.responses.create({
      model: "gpt-5",
      input: "Say hello to Nextify in one short sentence.",
    });

    return res.status(200).json({
      success: true,
      reply: response.output_text,
    });
  } catch (error) {
    console.error("OpenAI Test Error:", error);

    return res.status(500).json({
      success: false,
      message: "OpenAI request failed",
      error: error.message,
    });
  }
});
module.exports = router;
