import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { songSchema, getSectionHeading, type SongInput, type VisualProjectDocument } from '@wls/shared';
import { presentationType } from './schema';
import { rtfToText, textToRtf } from './rtf';

export const MAX_PRO_SIZE = 5 * 1024 * 1024;
const uuid = z.object({ string: z.string().max(100) });
const cueSchema = z.object({ uuid, isEnabled: z.boolean().default(false), actions: z.array(z.object({ isEnabled: z.boolean().default(false), slide: z.object({ presentation: z.object({ baseSlide: z.object({ elements: z.array(z.object({ element: z.object({ hidden: z.boolean().optional(), text: z.object({ rtfData: z.instanceof(Uint8Array).optional() }).optional() }).optional() })).max(1000).default([]) }) }) }).optional() })).max(1000).default([]) });
const decodedSchema = z.object({
  name: z.string().max(1000).optional(), musicKey: z.string().max(100).optional(), ccli: z.object({ artistCredits: z.string().max(1000).optional() }).optional(),
  selectedArrangement: uuid.optional(), arrangements: z.array(z.object({ uuid, groupIdentifiers: z.array(uuid).max(10000).default([]) })).max(1000).default([]),
  cueGroups: z.array(z.object({ group: z.object({ uuid, name: z.string().max(1000).optional() }), cueIdentifiers: z.array(uuid).max(10000).default([]) })).max(1000).default([]),
  cues: z.array(cueSchema).max(10000).default([]),
});

export function sectionType(label: string): SongInput['sections'][number]['type'] {
  const name = label.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (/pre[ -]?(refrao|chorus)/.test(name)) return 'PRE_CHORUS';
  if (/refrao|chorus/.test(name)) return 'CHORUS';
  if (/verso|verse|estrofe/.test(name)) return 'VERSE';
  if (/ponte|bridge/.test(name)) return 'BRIDGE';
  if (/intro|preludio/.test(name)) return 'INTRO';
  if (/final|outro/.test(name)) return 'OUTRO';
  return 'CUSTOM';
}

export function importProPresenter(bytes: Uint8Array, filename = 'Música.pro') {
  if (!bytes.length || bytes.length > MAX_PRO_SIZE) throw new Error('Envie um arquivo .pro de até 5 MB.');
  let data: z.infer<typeof decodedSchema>;
  try { data = decodedSchema.parse(presentationType.toObject(presentationType.decode(bytes), { bytes: Buffer })); }
  catch { throw new Error('Arquivo .pro inválido ou versão não suportada. Use uma apresentação do ProPresenter 7 ou posterior.'); }
  if (!data.name || !data.cues.length) throw new Error('O arquivo não contém uma apresentação ProPresenter com slides.');
  const cueMap = new Map(data.cues.map(cue => [cue.uuid.string, cue]));
  if (cueMap.size !== data.cues.length) throw new Error('A apresentação contém identificadores de slides duplicados.');
  const groupMap = new Map(data.cueGroups.map(group => [group.group.uuid.string, group]));
  const arrangement = data.arrangements.find(item => item.uuid.string === data.selectedArrangement?.string);
  const groups = arrangement?.groupIdentifiers.length ? arrangement.groupIdentifiers.map(id => {
    const group = groupMap.get(id.string); if (!group) throw new Error('O arranjo referencia um grupo ausente.'); return group;
  }) : data.cueGroups;
  const used = new Set<string>();
  const sections: SongInput['sections'] = [];
  let emptySlides = 0, disabledSlides = 0, headings = 0;
  function add(label: string, ids: string[]) {
    const lines: { text: string }[] = [];
    for (const id of ids) {
      used.add(id);
      const cue = cueMap.get(id); if (!cue) throw new Error('Um grupo referencia um slide ausente.');
      if (cue.isEnabled === false) { disabledSlides++; continue; }
      const text = cue.actions.filter(action => action.isEnabled !== false).flatMap(action => action.slide?.presentation.baseSlide.elements ?? [])
        .filter(item => !item.element?.hidden).map(item => item.element?.text?.rtfData).flatMap(rtf => rtf?.length ? [rtfToText(rtf)] : []).filter(Boolean).join('\n').trim();
      if (!text) { emptySlides++; continue; }
      if (getSectionHeading(text)) { headings++; continue; }
      if (text.length > 500) throw new Error('Um slide contém mais de 500 caracteres. Divida esse slide no ProPresenter antes de importar.');
      lines.push({ text });
    }
    for (let i = 0; i < lines.length; i += 100) sections.push({ type: sectionType(label), label: `${label || 'Slides'}${i ? ` · parte ${i / 100 + 1}` : ''}`.slice(0, 100), lines: lines.slice(i, i + 100) });
  }
  for (const group of groups) add(group.group.name ?? 'Slides', group.cueIdentifiers.map(id => id.string));
  // In a selected arrangement, groups not selected are intentionally excluded.
  const groupedIds = new Set(data.cueGroups.flatMap(group => group.cueIdentifiers.map(id => id.string)));
  const orphanIds = data.cues.filter(cue => !used.has(cue.uuid.string) && (!arrangement || !groupedIds.has(cue.uuid.string))).map(cue => cue.uuid.string);
  if (orphanIds.length) add('Slides sem grupo', orphanIds);
  if (!sections.length) throw new Error('Nenhuma letra foi encontrada nos slides habilitados.');
  if (sections.length > 100) throw new Error('A apresentação ultrapassa o limite de 100 seções.');
  const song = songSchema.parse({ title: (data.name || filename.replace(/\.pro$/i, '')).slice(0, 200), artist: data.ccli?.artistCredits?.slice(0, 200) || null, key: data.musicKey?.slice(0, 20) || null, sections });
  const warnings = ['A importação traz letras, grupos e ordem dos slides. Fundos, estilos, mídias, ações e tempos do ProPresenter não são importados.'];
  if (arrangement) warnings.push('Foi utilizada a ordem do arranjo selecionado, incluindo os grupos repetidos.');
  if (emptySlides) warnings.push(`${emptySlides} slide(s) vazio(s) ou sem texto foram ignorados.`);
  if (disabledSlides) warnings.push(`${disabledSlides} slide(s) desabilitado(s) foram ignorados.`);
  if (headings) warnings.push(`${headings} marcador(es) de seção foram omitidos das letras.`);
  return { song, slides: sections.reduce((total, section) => total + section.lines.length, 0), emptySlides, warnings };
}

const id = () => ({ string: randomUUID() });
export function exportProPresenter(song: SongInput): Uint8Array {
  const input = songSchema.parse(song);
  const cues: object[] = [], cueGroups: object[] = [];
  for (const section of input.sections) {
    const groupId = id(), cueIdentifiers = [];
    for (const line of section.lines) {
      if (getSectionHeading(line.text)) continue;
      const cueId = id(), elementId = id(); cueIdentifiers.push(cueId);
      cues.push({ uuid: cueId, name: String(cues.length + 1), isEnabled: true, actions: [{ uuid: id(), name: 'Slide', type: 11, isEnabled: true, slide: { presentation: { baseSlide: {
        uuid: id(), size: { width: 1920, height: 1080 }, drawsBackgroundColor: true, backgroundColor: { alpha: 1 }, elementBuildOrder: [elementId], elements: [{ element: {
          uuid: elementId, name: 'Letra', opacity: 1, bounds: { origin: { x: 120, y: 100 }, size: { width: 1680, height: 880 } },
          path: { closed: true, shape: { type: 1 }, points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }].map(point => ({ point, q0: point, q1: point })) }, fill: { color: { alpha: 0 }, enable: false }, stroke: { color: { alpha: 1 }, enable: false }, shadow: { color: { alpha: 1 }, enable: false }, feather: { enable: false }, text: {
            rtfData: textToRtf(line.text), shadow: { color: { alpha: 1 }, enable: false }, margins: {}, verticalAlignment: 1, scaleBehavior: 2, attributes: { font: { name: 'ArialMT', family: 'Arial', face: 'Regular', size: 60 }, textSolidFill: { red: 1, green: 1, blue: 1, alpha: 1 }, paragraphStyle: { alignment: 2, lineHeightMultiple: 1 } },
          },
        } }],
      } } } }] });
    }
    if (cueIdentifiers.length) { cueGroups.push({ group: { uuid: groupId, name: section.label, applicationGroupIdentifier: groupId, applicationGroupName: section.label, color: { red: .35, green: .45, blue: .8, alpha: 1 } }, cueIdentifiers }); }
  }
  if (!cues.length) throw new Error('Adicione letras antes de exportar.');
  // Use ProPresenter's implicit original arrangement. Custom arrangements refer
  // to application group identities, not the individual cue-group instances.
  const message = { applicationInfo: { platform: 2, application: 1, applicationVersion: { majorVersion: 7, minorVersion: 15 } }, uuid: id(), name: input.title, musicKey: input.key ?? '', ccli: { songTitle: input.title, artistCredits: input.artist ?? '' }, cueGroups, cues };
  const error = presentationType.verify(message); if (error) throw new Error('Não foi possível gerar a apresentação.');
  return presentationType.encode(presentationType.create(message)).finish();
}

export function visualProjectSong(name: string, document: VisualProjectDocument): SongInput {
  const sections: SongInput['sections'] = [];
  for (const clip of document.clips) {
    if (getSectionHeading(clip.text)) continue;
    let section = sections.at(-1);
    if (!section || section.label !== clip.section || section.lines.length >= 100) { section = { type: sectionType(clip.section), label: clip.section || 'Slides', lines: [] }; sections.push(section); }
    section.lines.push({ text: clip.text });
  }
  return songSchema.parse({ title: name, sections });
}
