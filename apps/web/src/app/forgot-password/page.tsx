import { EmailActionForm } from '@/components/email-action-form';
export const metadata = { title: 'Recuperar senha — Worship Lyrics Studio', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <EmailActionForm mode="forgot" />; }
