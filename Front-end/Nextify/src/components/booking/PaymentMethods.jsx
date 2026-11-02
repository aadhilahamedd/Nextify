const LEADS = {
  'booking.waPayLead': 'Confirm on WhatsApp, then pay securely.',
  'confirm.payMethodsLead': 'After confirmation you can pay securely.',
};

const METHODS = [
  { id: 'mada', label: 'mada', src: '/images/pay/mada.webp' },
  { id: 'visa', label: 'Visa', src: '/images/pay/visa.webp', tone: 'dark' },
  { id: 'mastercard', label: 'Mastercard', src: '/images/pay/mastercard.webp' },
  { id: 'apple-pay', label: 'Apple Pay', src: '/images/pay/apple-pay.webp' },
  { id: 'samsung-pay', label: 'Samsung Pay', src: '/images/pay/samsung-pay.webp', tone: 'badge' },
  { id: 'google-pay', label: 'G Pay', src: '/images/pay/gpay.webp' },
];

export default function PaymentMethods({ leadKey = 'booking.waPayLead' }) {
  return (
    <div className="book-pay-methods" dir="ltr" lang="en">
      <p className="book-pay-methods-lead">{LEADS[leadKey] || LEADS['booking.waPayLead']}</p>
      <p className="book-pay-methods-accept">We accept</p>
      <ul className="book-pay-methods-list">
        {METHODS.map(({ id, label, src, tone }) => (
          <li key={id} className={`book-pay-logo${tone ? ` is-${tone}` : ''}`}>
            <img src={src} alt={label} />
          </li>
        ))}
      </ul>
    </div>
  );
}
