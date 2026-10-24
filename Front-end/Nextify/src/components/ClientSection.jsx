import React from 'react';
import Container from 'react-bootstrap/Container';
import { useLanguage } from '../i18n/LanguageContext';

const clients = [
  { name: 'Ajeej Capital', logo: '/images/Clients/AJEEJ capital.png', fit: 'wide' },
  { name: 'Al Badiah Transportation', logo: '/images/Clients/Al badiah.png', fit: 'tall' },
  { name: 'Care Solutions', logo: '/images/Clients/Care Solutions.png', fit: 'tall' },
  { name: 'ITL World', logo: '/images/Clients/ITL Company.jpeg', fit: 'square' },
  { name: 'Roland Berger', logo: '/images/Clients/Roland Berger.png', fit: 'wide' },
  { name: 'Seven Seas Services', logo: '/images/Clients/Seven Seas Services.jpeg', fit: 'wide' },
];

export default function ClientSection() {
  const { t } = useLanguage();
  return (
    <section className="clients-section" aria-labelledby="clients-heading">
      <Container>
        <div className="clients-heading">
          <p className="clients-kicker">{t('clients.kicker')}</p>
          <h2 id="clients-heading" className="clients-title">
            {t('clients.title')}
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
