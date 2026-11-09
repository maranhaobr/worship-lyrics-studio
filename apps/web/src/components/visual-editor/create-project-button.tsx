'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { readResponse } from '@/hooks/use-visual-editor';
export function CreateProjectButton({ songId }: { songId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function create() {
    setBusy(true); setError('');
    try {
      const project = await readResponse<{ id: string }>(await fetch('/api/visual-projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId }) }));
      router.push(`/visual-projects/${project.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Erro ao criar projeto'); setBusy(false); }
  }
  return <div><button className="btn-secondary" disabled={busy} onClick={create}>{busy ? 'Criando...' : 'Criar projeto visual'}</button>{error && <p role="alert" className="text-red-300 mt-2 text-sm">{error}</p>}</div>;
}
