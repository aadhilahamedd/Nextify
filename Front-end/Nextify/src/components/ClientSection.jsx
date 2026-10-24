import React from 'react';
import Container from 'react-bootstrap/Container';

const clients = [
  { name: 'Ajeej Capital', logo: '/images/Clients/AJEEJ capital.png', fit: 'wide' },
  { name: 'Al Badiah Transportation', logo: '/images/Clients/Al badiah.png', fit: 'tall' },
  { name: 'Care Solutions', logo: '/images/Clients/Care Solutions.png', fit: 'tall' },
  { name: 'ITL World', logo: '/images/Clients/ITL Company.jpeg', fit: 'square' },
  { name: 'Roland Berger', logo: '/images/Clients/Roland Berger.png', fit: 'wide' },
  { name: 'Seven Seas Services', logo: '/images/Clients/Seven Seas Services.jpeg', fit: 'wide' },
];

export default function ClientSection() {
  return (
    <section className="clients-section" aria-labelledby="clients-heading">
      <Container>
        <div className="clients-heading">
          <p className="clients-kicker">Our Clients</p>
          <h2 id="clients-heading" className="clients-title">
            Trusted by businesses and organizations
          </h2>
        </div>

        <div className="clients-grid">
          {clients.map((client) => (
            <div key={client.name} className="clients-card">
              <img
                src={encodeURI(client.logo)}
                alt={client.name}
                className={`clients-logo clients-logo-${client.fit}`}
              />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
