module.exports = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
  // Cloud API Graph version used for outbound messages only.
  get configured() {
    return Boolean(this.accessToken && this.phoneNumberId);
  },
  get verificationReady() {
    return Boolean(this.verifyToken);
  },
};
