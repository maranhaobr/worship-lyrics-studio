import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { projectFromSong, templatePresets, type CompositionProps } from '@wls/shared';

async function main() {
  const output = resolve('out/themes');
  await mkdir(output, { recursive: true });
  const serveUrl = await bundle({ entryPoint: resolve('packages/video/src/remotion/index.ts') });
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;
  for (const preset of templatePresets.filter(item => item.style.decoration)) {
    const document = projectFromSong({ title: 'Tema', sections: [{ type: 'VERSE', label: 'Verso', lines: [{ text: 'Santo para sempre' }] }] }, () => 'sample');
    document.style = structuredClone(preset.style);
    const inputProps: CompositionProps = { document, media: {} };
    const composition = await selectComposition({ serveUrl, id: 'WorshipLyrics', inputProps, browserExecutable });
    await renderStill({ serveUrl, composition, inputProps, frame: 45, output: resolve(output, `${preset.id}.png`), browserExecutable });
    console.log(preset.name);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
