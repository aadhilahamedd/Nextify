import { useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { URLS } from '../../data/legalContent';

function linkify(text) {
  const nodes = [];
  const source = String(text);
  const re = /(https?:\/\/[^\s]+)|([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
  let last = 0;
  let match;
  let key = 0;
  while ((match = re.exec(source)) !== null) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    const raw = match[0];
    const trailing = raw.match(/[).,;:]+$/)?.[0] || '';
    const value = trailing ? raw.slice(0, -trailing.length) : raw;
    const isLocal = /localhost|127\.0\.0\.1/i.test(value);
    if (value.startsWith('http') && !isLocal) {
      nodes.push(
        <a key={`url-${key++}`} href={value}>
          {value}
        </a>
      );
    } else if (value.includes('@') && !isLocal) {
      nodes.push(
        <a key={`url-${key++}`} href={`mailto:${value}`}>
          {value}
        </a>
      );
    } else {
      nodes.push(raw);
    }
    if (trailing && !isLocal && (value.startsWith('http') || value.includes('@'))) nodes.push(trailing);
    last = match.index + raw.length;
  }
  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
}

const DEFAULT_TITLE = 'NEXTIFY LIMO | Luxury Chauffeur Service in Saudi Arabia';

export default function LegalDocument({ content, otherTo, otherLabel }) {
  const { t } = useLanguage();

  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    document.title = `${content.title} | NEXTIFY LIMO`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        `${content.title} for NEXTIFY LIMO, the chauffeur brand of NEXTIFY BUSINESS SERVICE. ${URLS.privacy} · ${URLS.terms} · ${URLS.contact}`
      );
    }
    window.scrollTo(0, 0);
    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (meta) meta.setAttribute('content', previousDescription);
    };
  }, [content.title]);

  return (
    <div className="legal-page">
      <Container>
        <p className="legal-kicker">{content.kicker}</p>
        <h1 className="legal-title">{content.title}</h1>
        <p className="legal-updated">{content.updated}</p>
        <p className="legal-intro">{linkify(content.intro)}</p>

        {content.sections.map((section) => (
          <section key={section.heading} className="legal-section">
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p}>{linkify(p)}</p>
            ))}
            {section.list?.length ? (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{linkify(item)}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <div className="legal-links">
          <Link to={otherTo}>{otherLabel}</Link>
          <Link to="/contact">{t('nav.contact')}</Link>
        </div>
        <p className="legal-canonical">
          <a href={URLS.privacy}>{URLS.privacy}</a>
          <br />
          <a href={URLS.terms}>{URLS.terms}</a>
          <br />
          <a href={URLS.contact}>{URLS.contact}</a>
        </p>
      </Container>
    </div>
  );
}
