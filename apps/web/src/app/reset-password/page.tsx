import { EmailActionForm } from '@/components/email-action-form';
export const metadata = { title: 'Nova senha — Worship Lyrics Studio', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <EmailActionForm mode="reset" />; }
