import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function workspaceRoot(): string {
  let directory = process.cwd();
  while (true) {
    if (existsSync(resolve(directory, 'packages/video/package.json')) && existsSync(resolve(directory, 'apps/web/package.json'))) return directory;
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Não foi possível localizar a raiz do projeto');
    directory = parent;
  }
}
