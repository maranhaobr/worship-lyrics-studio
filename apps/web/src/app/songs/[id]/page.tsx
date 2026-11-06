import { notFound } from 'next/navigation';
import { getSong } from '@/lib/song-data';
import SongEditor from '@/components/song-editor';
export const dynamic='force-dynamic';
export default async function EditSong({params}:{params:Promise<{id:string}>}){const {id}=await params;const song=await getSong(id);if(!song)notFound();return <SongEditor song={{id:song.id,title:song.title,artist:song.artist??'',key:song.key??'',bpm:song.bpm,sections:song.sections.map(s=>({type:s.type,label:s.label,lines:s.lines.map(l=>({text:l.text,startMs:l.startMs,endMs:l.endMs}))}))}}/>;}
