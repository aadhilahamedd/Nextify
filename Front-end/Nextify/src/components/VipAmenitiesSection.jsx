import Container from 'react-bootstrap/Container';
import './VipAmenitiesSection.css';

const VIP_AMENITIES = [
  {
    id: 'climate',
    title: 'Climate-Controlled Cabins',
    description: "Custom multi-zone AC for Riyadh's extreme weather.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
      </svg>
    ),
  },
  {
    id: 'refreshments',
    title: 'Premium Refreshments',
    description: 'Complimentary bottled water available on every trip.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    ),
  },
  {
    id: 'luggage',
    title: 'Luggage Assistance',
    description: 'From 2 bags to 40 bags in our King Size buses, your chauffeur handles the heavy lifting.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6" y="7" width="12" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M10 11v5M14 11v5" />
      </svg>
    ),
  },
  {
    id: 'sanitization',
    title: 'Deep Sanitization',
    description: 'Every vehicle undergoes a strict cleaning protocol before dispatch.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
      </svg>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy & Discretion',
    description: 'Tinted windows and strict privacy policies for high-profile clients.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'wifi',
    title: 'Onboard Wi-Fi',
    description: 'Stay connected throughout your journey with onboard Wi-Fi where available.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.55a11 11 0 0 1 14.08 0" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <path d="M1.42 9a16 16 0 0 1 21.16 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
    ),
  },
  {
    id: 'charging',
    title: 'Charging Convenience',
    description: 'Convenient charging ports to keep your devices powered throughout the ride where available.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
];

export default function VipAmenitiesSection() {
  return (
    <section id="vip-amenities" className="vip-amenities-section py-5">
      <Container className="py-5">
        <div className="text-center mb-5 vip-amenities-header">
          <div className="d-inline-flex align-items-center gap-3 mb-3">
            <span className="vip-amenities-rule" />
            <span className="vip-amenities-kicker">IN-CABIN EXPERIENCE</span>
            <span className="vip-amenities-rule" />
          </div>
          <h2 className="display-5 fw-normal mb-3 vip-amenities-title">
            The VIP Standard: What&apos;s Inside Your Ride?
          </h2>
          <p className="vip-amenities-subtitle mb-0">
            Every Nextify journey is prepared with meticulous attention to comfort, discretion, and executive readiness.
          </p>
        </div>

        <div className="vip-amenities-grid">
          {VIP_AMENITIES.map((item) => (
            <article key={item.id} className="vip-amenity-card">
              <div className="vip-amenity-icon">{item.icon}</div>
              <h3 className="vip-amenity-card-title">{item.title}</h3>
              <p className="vip-amenity-card-desc mb-0">{item.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
