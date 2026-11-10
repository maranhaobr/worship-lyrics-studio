import Link from 'next/link';
import { ProPresenterImporter } from '@/components/propresenter-importer';
export default function ImportSongs() {
  return <div className="space-y-5"><Link href="/songs" className="text-sm text-slate-400">← Biblioteca</Link><h1 className="text-3xl font-bold">Importar do ProPresenter</h1><p className="text-slate-400">Traga letras e grupos de uma apresentação para criar seu lyric video.</p><ProPresenterImporter /></div>;
}
