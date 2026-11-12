import type { Metadata } from 'next';
import { LandingPage } from '@/components/marketing/landing-page';
import './marketing.css';

export const metadata: Metadata = {
  title: 'Worship Lyrics Studio — Dê vida às palavras do seu louvor',
  description: 'Transforme letras em lyric videos para sua igreja. Personalize cada slide, sincronize com a música e exporte para a sua próxima celebração.',
  openGraph: { title: 'Worship Lyrics Studio', description: 'Sua mensagem merece ganhar vida. Crie lyric videos para a sua igreja.', type: 'website', locale: 'pt_BR' },
};
export default function HomePage() { return <LandingPage />; }
