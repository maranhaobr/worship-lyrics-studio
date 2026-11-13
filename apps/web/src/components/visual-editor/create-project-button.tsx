'use client';
import { useTranslation } from '@/components/preferences-provider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { readResponse } from '@/hooks/use-visual-editor';
import { useToastFeedback } from '@/components/toast-provider';
export function CreateProjectButton({ songId }: { songId: string }) {
  const t = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { setError, setMessage } = useToastFeedback();
  async function create() {
    setBusy(true); setError('');
    try {
      const project = await readResponse<{ id: string }>(await fetch('/api/visual-projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId }) }));
      setMessage('Projeto visual criado'); router.push(`/visual-projects/${project.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : 'Erro ao criar projeto'); setBusy(false); }
  }
  return <div><button className="btn-secondary" disabled={busy} onClick={create}>{busy ? t("Criando...") : t("Criar projeto visual")}</button></div>;
}
