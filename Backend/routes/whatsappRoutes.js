const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/api/whatsapp/webhook', whatsappController.verifyWebhook);
router.post('/api/whatsapp/webhook', whatsappController.receiveWebhook);

module.exports = router;
