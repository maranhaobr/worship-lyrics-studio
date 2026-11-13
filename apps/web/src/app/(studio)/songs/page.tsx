import { getTranslator } from '@/lib/i18n/server';
import Link from 'next/link';
import { listSongs } from '@/lib/song-data';
import { requireActor } from '@/lib/auth/session';
import { can } from '@wls/shared';
import { AudioLines, FileText, Library, Music2, Plus, Search, Upload } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Songs({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getTranslator();
  const { role } = await requireActor();
  const canEdit = can(role, 'edit');
  const { q = '' } = await searchParams;
  const songs = await listSongs(q);
  return <div><header className="studio-page-title"><div><span className="studio-eyebrow">{t("CADA LETRA TEM O SEU LUGAR")}</span><h1>{t("Biblioteca de músicas")}</h1><p>{t("Organize o repertório. Encontre a próxima inspiração.")}</p></div>{canEdit && <div className="studio-page-actions"><Link href="/songs/import" className="btn-secondary"><Upload size={14} />{t(" Importar ProPresenter")}</Link><Link href="/songs/new" className="btn"><Plus size={16} />{t(" Nova música")}</Link></div>}</header>
    <form className="studio-list-search" role="search"><Search size={17} /><input aria-label={t("Buscar por música ou artista")} name="q" defaultValue={q} placeholder={t("Buscar por música ou artista...")} /><button className="btn-secondary" aria-label={t("Buscar")}>{t("Buscar")}</button></form>
    <div className="studio-section-head"><p>{songs.length} {songs.length === 1 ? t('música encontrada') : t('músicas encontradas')}{q ? ` ${t('para')} “${q}”` : ` ${t('na sua biblioteca')}`}</p></div>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{songs.map(song => <Link key={song.id} href={`/songs/${song.id}`} className="card studio-song-card hover:border-accent"><div className="flex items-center gap-3"><span className="studio-song-icon"><Music2 size={21} /></span><div className="min-w-0"><h2 className="truncate">{song.title}</h2><p className="text-slate-400 text-xs mt-1 truncate">{song.artist || t('Artista não informado')}</p></div></div><div className="studio-song-meta"><span><FileText size={12} />{song._count.sections}{t(" seções")}</span><span><AudioLines size={12} />{song.bpm ? `${song.bpm} BPM` : t('Sem BPM')}</span>{song.key && <span>{t("Tom ")}{song.key}</span>}</div></Link>)}</div>
    {!songs.length && <div className="studio-empty"><Library size={28} /><h2>{q ? t('Não encontramos essa música') : t('Vamos montar o seu repertório?')}</h2><p>{q ? t('Tente outro título ou nome de artista para encontrar o que procura.') : t('As músicas cadastradas pela sua equipe aparecerão aqui, prontas para novos projetos.')}</p>{canEdit && !q && <Link href="/songs/new" className="btn"><Plus size={14} />{t(" Cadastrar primeira música")}</Link>}</div>}
  </div>;
}