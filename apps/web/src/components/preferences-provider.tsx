'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { htmlLanguages, translator, type AppTheme, type Locale } from '@/lib/i18n';

type Preferences = { locale: Locale; theme: AppTheme; setLocale: (locale: Locale) => void; setTheme: (theme: AppTheme) => void; t: ReturnType<typeof translator> };
const Context = createContext<Preferences | null>(null);
function persist(name: string, value: string) {
  document.cookie = `${name}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}
export function PreferencesProvider({ children, initialLocale, initialTheme }: { children: React.ReactNode; initialLocale: Locale; initialTheme: AppTheme }) {
  const [locale, updateLocale] = useState(initialLocale), [theme, updateTheme] = useState(initialTheme);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { document.documentElement.lang = htmlLanguages[locale]; document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [locale, theme]);
  const value = useMemo<Preferences>(() => ({ locale, theme, t: translator(locale), setLocale(next) {
    updateLocale(next); persist('wls_locale', next);
    // Lists use server translations; client editors keep their unsaved state.
    if (['/dashboard', '/songs', '/visual-projects'].includes(pathname)) router.refresh();
  }, setTheme(next) { updateTheme(next); persist('wls_theme', next); } }), [locale, theme, router, pathname]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function usePreferences() { const context = useContext(Context); if (!context) throw new Error('PreferencesProvider is required'); return context; }
export function useTranslation() { return usePreferences().t; }
