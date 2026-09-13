import { LanguageType, TranslationDictionary } from './types';
import { zh } from './zh';
import { en } from './en';

export * from './types';
export { zh } from './zh';
export { en } from './en';

export const DEFAULT_LANGUAGE: LanguageType = 'zh';

export const translations: Record<LanguageType, TranslationDictionary> = {
  zh,
  en,
};

export function getLanguageName(lang: LanguageType): string {
  switch (lang) {
    case 'zh':
      return '简体中文';
    case 'en':
      return 'English';
    default:
      return '简体中文';
  }
}

/**
 * Type-safe path translation helper with parameter interpolation
 * Example: t('nav.home', 'zh') => '资产'
 */
export function t(
  path: string,
  lang: LanguageType = DEFAULT_LANGUAGE,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations[DEFAULT_LANGUAGE];
  const keys = path.split('.');

  let current: any = dict;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      // Fallback to default language if missing in current language
      let fallback: any = translations[DEFAULT_LANGUAGE];
      for (const fKey of keys) {
        if (fallback && typeof fallback === 'object' && fKey in fallback) {
          fallback = fallback[fKey];
        } else {
          return path;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') {
    return path;
  }

  if (!params) {
    return current.replace(/\{(\w+)\}\s*/g, '').trim();
  }

  return current.replace(/\{(\w+)\}/g, (_, k) => {
    return params[k] !== undefined ? String(params[k]) : '';
  });
}
