const generateBookingNumber = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `NXT-${datePart}-${randomPart}`;
};

module.exports = { generateBookingNumber };
