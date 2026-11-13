import { EmailActionForm } from '@/components/email-action-form';
export const metadata = { title: 'Confirmar e-mail — Worship Lyrics Studio', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function VerifyEmailPage() { return <EmailActionForm mode="verify" />; }
