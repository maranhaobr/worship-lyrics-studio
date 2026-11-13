import './globals.css';
import './editor-workspace.css';
import { ToastProvider } from '@/components/toast-provider';
import { PreferencesProvider } from '@/components/preferences-provider';
import { cookies } from 'next/headers';
import { htmlLanguages, parseLocale, parseTheme } from '@/lib/i18n';
import './preferences.css';
export const metadata = { title: 'Worship Lyrics Studio', description: 'Gerencie letras e apresentações de louvor' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get('wls_locale')?.value), theme = parseTheme(cookieStore.get('wls_theme')?.value);
  return <html lang={htmlLanguages[locale]} data-theme={theme} style={{ colorScheme: theme }}><body><PreferencesProvider initialLocale={locale} initialTheme={theme}><ToastProvider>{children}</ToastProvider></PreferencesProvider></body></html>;
}
