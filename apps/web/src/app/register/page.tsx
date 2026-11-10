import { AuthForm } from '@/components/auth-form';
export default async function Register({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) { return <AuthForm mode="register" invitation={(await searchParams).invitation} />; }
