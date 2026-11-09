import { statfsSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

if (!existsSync('services/alignment/Dockerfile')) throw new Error('Execute este comando na raiz do repositório');
try { execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'ignore', timeout: 15000 }); }
catch { throw new Error('O Docker não respondeu. Inicie ou recupere o Docker Desktop antes de iniciar o alinhamento.'); }
let build = process.argv.includes('--build');
try { execFileSync('docker', ['image', 'inspect', 'worship-lyrics-studio-alignment-worker:latest'], { stdio: 'ignore' }); }
catch { build = true; }
if (build) {
  const disk = statfsSync(process.cwd());
  const freeGb = disk.bavail * disk.bsize / 1024 ** 3;
  if (freeGb < 12) throw new Error(`Espaço insuficiente para construir o worker: ${freeGb.toFixed(1)} GB livres. Libere pelo menos 12 GB antes de baixar/construir as dependências. Nenhum arquivo foi apagado.`);
}
const result = spawnSync('docker', ['compose', '--profile', 'alignment', 'up', '-d', build ? '--build' : '--no-build', 'alignment-worker'], { stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
