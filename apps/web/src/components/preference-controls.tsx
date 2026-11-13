'use client';
import { Languages, Moon, Sun } from 'lucide-react';
import { locales, type Locale } from '@/lib/i18n';
import { usePreferences } from './preferences-provider';

export function PreferenceControls() {
  const { locale, theme, setLocale, setTheme, t } = usePreferences();
  return <div className="preference-controls" role="group" aria-label={t('Preferências de exibição')}>
    <button type="button" className="preference-theme" data-theme-toggle aria-label={t(theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro')} title={t(theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro')} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
    <label className="preference-language"><Languages size={15} aria-hidden="true" /><span className="sr-only">{t('Idioma')}</span><select data-locale-select aria-label={t('Idioma')} value={locale} onChange={event => setLocale(event.target.value as Locale)}>{locales.map(value => <option value={value} key={value}>{({ pt: 'Português', en: 'English', es: 'Español' })[value]}</option>)}</select></label>
  </div>;
}
