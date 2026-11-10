'use client';
import { useState } from 'react';
import type { VisualProjectDocument } from '@wls/shared';
import { useToast } from './toast-provider';

export function ProPresenterExportButton({ songId, projectId, document }: { songId?: string; projectId?: string; document?: VisualProjectDocument }) {
  const [busy, setBusy] = useState(false);
  const notify = useToast();
  async function download() {
    setBusy(true);
    try {
      const response = await fetch(songId ? `/api/songs/${songId}/propresenter` : `/api/visual-projects/${projectId}/propresenter`, document ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(document) } : undefined);
      if (!response.ok) { const error = await response.json() as { error?: string }; throw new Error(error.error ?? 'Falha ao exportar'); }
      const filename = /filename\*=UTF-8''(.+)/i.exec(response.headers.get('Content-Disposition') ?? '')?.[1];
      const url = URL.createObjectURL(await response.blob());
      const link = window.document.createElement('a'); link.href = url; link.download = filename ? decodeURIComponent(filename) : 'musica.pro';
      window.document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Arquivo .pro exportado com letras editáveis e grupos. Importe no ProPresenter para conferir.', 'success');
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível exportar', 'error'); }
    finally { setBusy(false); }
  }
  return <button type="button" className="btn-secondary" disabled={busy} onClick={() => void download()}>{busy ? 'Exportando...' : 'Exportar para ProPresenter (.pro)'}</button>;
}
