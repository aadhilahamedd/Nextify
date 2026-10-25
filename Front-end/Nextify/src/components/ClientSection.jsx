import React from 'react';
import Container from 'react-bootstrap/Container';
import { useLanguage } from '../i18n/LanguageContext';

const clients = [
  { name: 'Ajeej Capital', logo: '/images/Clients/AJEEJ capital.webp', fit: 'wide' },
  { name: 'Al Badiah Transportation', logo: '/images/Clients/Al badiah.webp', fit: 'tall' },
  { name: 'Care Solutions', logo: '/images/Clients/Care Solutions.webp', fit: 'tall' },
  { name: 'ITL World', logo: '/images/Clients/ITL Company.webp', fit: 'square' },
  { name: 'Roland Berger', logo: '/images/Clients/Roland Berger.webp', fit: 'wide' },
  { name: 'Seven Seas Services', logo: '/images/Clients/Seven Seas Services.webp', fit: 'wide' },
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
