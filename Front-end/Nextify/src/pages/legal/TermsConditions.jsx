import { useLanguage } from '../../i18n/LanguageContext';
import { getTermsContent } from '../../data/legalContent';
import LegalDocument from './LegalDocument';

export default function TermsConditions() {
  const { lang, t } = useLanguage();
  return (
    <LegalDocument
      content={getTermsContent(lang)}
      otherTo="/privacy-policy"
      otherLabel={t('footer.privacy')}
    />
  );
}
