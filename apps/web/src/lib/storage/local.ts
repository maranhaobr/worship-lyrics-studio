import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Explicit configuration is shared by the web process and the future render worker.
const root = () => resolve(process.env.MEDIA_STORAGE_DIR ?? '../../.data/media');
function assetPath(key: string) {
  if (!/^[a-f0-9-]+\.(png|jpg|webp|mp4|webm)$/u.test(key)) throw new Error('Invalid storage key');
  return resolve(root(), key);
}
export async function storeMedia(key: string, bytes: Uint8Array) {
  await mkdir(root(), { recursive: true });
  await writeFile(assetPath(key), bytes, { flag: 'wx' });
}
export const readMedia = (key: string) => readFile(assetPath(key));
export const removeMedia = (key: string) => unlink(assetPath(key));
