import Link from 'next/link';
import { LyricsImporter } from '@/components/visual-editor/lyrics-importer';
import { listVisualTemplates } from '@/lib/visual-template-data';
export const dynamic = 'force-dynamic';
export default async function NewVisualProjectPage() {
  const templates = await listVisualTemplates();
  return <div className="space-y-6"><div><Link className="text-sm text-slate-400" href="/visual-projects">← Projetos visuais</Link><h1 className="text-3xl font-bold mt-2">Crie um vídeo com a letra inteira</h1><p className="text-slate-400 mt-2">Envie a letra, escolha um visual e receba seu vídeo completo. Depois, personalize slide a slide.</p></div><LyricsImporter templates={templates} /></div>;
}
