import messages from './messages.json';
export const locales = ['pt', 'en', 'es'] as const;
export type Locale = typeof locales[number];
export type AppTheme = 'light' | 'dark';
export const htmlLanguages: Record<Locale, string> = { pt: 'pt-BR', en: 'en', es: 'es' };
export function parseLocale(value: string | undefined): Locale { return locales.includes(value as Locale) ? value as Locale : 'pt'; }
export function parseTheme(value: string | undefined): AppTheme { return value === 'dark' ? 'dark' : 'light'; }
const catalog: Record<string, { en: string; es: string }> = messages;
export function translator(locale: Locale) {
  return (source: string) => {
    if (locale === 'pt') return source;
    const key = source.trim(), translated = catalog[key]?.[locale];
    return translated ? `${source.match(/^\s*/u)?.[0] ?? ''}${translated}${source.match(/\s*$/u)?.[0] ?? ''}` : source;
  };
}
