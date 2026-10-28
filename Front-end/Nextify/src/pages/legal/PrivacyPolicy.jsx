import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getPrivacyContent } from '../../data/legalContent';
import LegalDocument from './LegalDocument';

export default function PrivacyPolicy() {
  const { lang, t } = useLanguage();
  return (
    <LegalDocument
      content={getPrivacyContent(lang)}
      otherTo="/terms-and-conditions"
      otherLabel={t('footer.terms')}
    />
  );
}
