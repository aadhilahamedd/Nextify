import React, { useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';

export default function LegalDocument({ content, otherTo, otherLabel }) {
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [content.title]);

  return (
    <div className="legal-page">
      <Container>
        <p className="legal-kicker">{content.kicker}</p>
        <h1 className="legal-title">{content.title}</h1>
        <p className="legal-updated">{content.updated}</p>
        <p className="legal-intro">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.list?.length ? (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <div className="legal-links">
          <Link to={otherTo}>{otherLabel}</Link>
          <Link to="/contact">{t('nav.contact')}</Link>
        </div>
      </Container>
    </div>
  );
}
