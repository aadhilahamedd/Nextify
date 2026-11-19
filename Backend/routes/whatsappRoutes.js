const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { verifyWhatsAppSignature } = require('../middleware/whatsappSignature');

router.get('/api/whatsapp/webhook', whatsappController.verifyWebhook);
router.post('/api/whatsapp/webhook', verifyWhatsAppSignature, whatsappController.receiveWebhook);

module.exports = router;
