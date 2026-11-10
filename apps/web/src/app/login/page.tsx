import { AuthForm } from '@/components/auth-form';
export default async function Login({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) { return <AuthForm mode="login" invitation={(await searchParams).invitation} />; }
