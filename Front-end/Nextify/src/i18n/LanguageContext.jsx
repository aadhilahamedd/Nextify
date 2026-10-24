import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { en } from './translations/en';
import { ar } from './translations/ar';
import { formatDateForLang, formatNumberForLang, formatSarForLang, formatUsdForLang } from './format';

const STORAGE_KEY = 'nextify-language';
const dictionaries = { en, ar };

const LanguageContext = createContext(null);

function lookup(dict, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), dict);
}

function applyDocumentLang(lang) {
  if (typeof document === 'undefined') return;
  const isAr = lang === 'ar';
  document.documentElement.lang = isAr ? 'ar' : 'en';
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  document.body.dir = isAr ? 'rtl' : 'ltr';
  document.body.classList.toggle('lang-ar', isAr);
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    let next = 'en';
    try {
      next = localStorage.getItem(STORAGE_KEY) === 'ar' ? 'ar' : 'en';
    } catch {
      next = 'en';
    }
    applyDocumentLang(next);
    return next;
  });

  useEffect(() => {
    applyDocumentLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const value = useMemo(() => {
    const t = (path, vars) => {
      const raw = lookup(dictionaries[lang], path) ?? lookup(en, path) ?? path;
      if (typeof raw !== 'string' || !vars) return raw;
      return Object.entries(vars).reduce((text, [key, val]) => text.replaceAll(`{${key}}`, String(val)), raw);
    };
    return {
      lang,
      isAr: lang === 'ar',
      setLang: (next) => setLangState(next === 'ar' ? 'ar' : 'en'),
      t,
      formatNumber: (n, options) => formatNumberForLang(n, lang, options),
      formatSar: (n) => formatSarForLang(n, lang),
      formatUsd: (n) => formatUsdForLang(n, lang),
      formatDate: (n) => formatDateForLang(n, lang),
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
