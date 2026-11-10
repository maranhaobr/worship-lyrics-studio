import './globals.css';
import './editor-workspace.css';
import { ToastProvider } from '@/components/toast-provider';
export const metadata = { title: 'Worship Lyrics Studio', description: 'Gerencie letras e apresentações de louvor' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR"><body><ToastProvider>{children}</ToastProvider></body></html>; }
