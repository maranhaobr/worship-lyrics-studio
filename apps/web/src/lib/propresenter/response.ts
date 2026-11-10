import { exportProPresenter } from './index';
import type { SongInput } from '@wls/shared';
export function proPresenterResponse(song: SongInput) {
  const bytes = exportProPresenter(song);
  const filename = `${song.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 150) || 'musica'}.pro`;
  return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="musica.pro"; filename*=UTF-8''${encodeURIComponent(filename)}`, 'Cache-Control': 'no-store' } });
}
