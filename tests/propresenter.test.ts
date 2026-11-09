import assert from 'node:assert/strict';
import test from 'node:test';
import { exportProPresenter, importProPresenter, visualProjectSong } from '../apps/web/src/lib/propresenter';
import { presentationType } from '../apps/web/src/lib/propresenter/schema';
import { rtfToText, textToRtf } from '../apps/web/src/lib/propresenter/rtf';
import { projectFromSong, type SongInput } from '../packages/shared/src';

const song: SongInput = { title: 'Apresentação de teste', artist: 'Teste', key: 'G', sections: [
  { type: 'VERSE', label: 'Verso 1', lines: [{ text: 'Glória e adoração\nAo Senhor {amor} \\ paz' }] },
  { type: 'CHORUS', label: 'Refrão', lines: [{ text: 'Santo para sempre 🎵' }, { text: 'Toda criação' }] },
] };

test('native presentation round-trip preserves accented lyrics, slide boundaries and section labels', () => {
  const result = importProPresenter(exportProPresenter(song));
  assert.equal(result.slides, 3);
  assert.deepEqual(result.song, song);
  const first = presentationType.toObject(presentationType.decode(exportProPresenter(song)));
  const second = presentationType.toObject(presentationType.decode(exportProPresenter(song)));
  assert.notDeepEqual(first.uuid, second.uuid, 'downloads must not share presentation IDs');
  assert.equal(first.selectedArrangement, undefined, 'native original arrangement must be selected implicitly');
  assert.equal(first.arrangements, undefined);
  assert.equal(new Set(first.cueGroups.map((g: { group: { applicationGroupIdentifier: { string: string } } }) => g.group.applicationGroupIdentifier.string)).size, 2, 'native group identities must not collapse into the default UUID');
  const element = first.cues[0].actions[0].slide.presentation.baseSlide.elements[0].element;
  assert.equal(element.path.shape.type, 1, 'native ElementHelper requires a shape to identify the text object');
  assert.equal(element.path.points.length, 4);
  for (const field of ['fill', 'stroke', 'shadow', 'feather']) assert.ok(element[field], `native graphics object requires ${field}`);
});

test('selected arrangements preserve repeated groups and exclude unselected groups', () => {
  const message = presentationType.toObject(presentationType.decode(exportProPresenter(song)));
  const groups = message.cueGroups.map((g: { group: { uuid: { string: string } } }) => g.group.uuid);
  message.selectedArrangement = { string: 'selected' };
  message.arrangements = [{ uuid: { string: 'selected' }, name: 'Teste', groupIdentifiers: groups }];
  message.arrangements[0].groupIdentifiers = [groups[1], groups[0], groups[1]];
  const result = importProPresenter(presentationType.encode(presentationType.fromObject(message)).finish());
  assert.deepEqual(result.song.sections.map(s => s.label), ['Refrão', 'Verso 1', 'Refrão']);
  assert.equal(result.slides, 5);
  message.arrangements[0].groupIdentifiers = [groups[0]];
  assert.equal(importProPresenter(presentationType.encode(presentationType.fromObject(message)).finish()).slides, 1);
});

test('blank and disabled slides are reported; corrupt input and missing references are rejected', () => {
  const message = presentationType.toObject(presentationType.decode(exportProPresenter(song)));
  message.cues[0].actions[0].slide.presentation.baseSlide.elements[0].element.text.rtfData = textToRtf('');
  message.cues[1].isEnabled = false;
  const result = importProPresenter(presentationType.encode(presentationType.fromObject(message)).finish());
  assert.equal(result.slides, 1);
  assert.equal(result.emptySlides, 1);
  assert.ok(result.warnings.some(w => w.includes('desabilitado')));
  message.cueGroups[0].cueIdentifiers[0].string = 'missing';
  assert.throws(() => importProPresenter(presentationType.encode(presentationType.fromObject(message)).finish()), /ausente/);
  assert.throws(() => importProPresenter(Buffer.from('not a presentation')));
  assert.throws(() => importProPresenter(new Uint8Array(5 * 1024 * 1024 + 1)), /5 MB/);
});

test('RTF ignores metadata and handles legacy accents, Unicode and escaped delimiters', () => {
  const source = "{\\rtf1\\ansi\\ansicpg1252{\\fonttbl{\\f0 Arial;}}{\\*\\generator Hidden metadata;}\\f0 Gl\\'f3ria\\par \\uc1\\u227? e \\{amor\\} \\\\}";
  assert.equal(rtfToText(Buffer.from(source)), 'Glória\nã e {amor} \\');
  assert.equal(rtfToText(textToRtf('Canção 🎵\nÀ Ti')), 'Canção 🎵\nÀ Ti');
  assert.throws(() => rtfToText(Buffer.from('{\\rtf1 incomplete')));
  assert.throws(() => rtfToText(Buffer.from('{\\rtf1\\bin999 x}')));
});

test('visual export preserves current slide order while omitting section-marker clips', () => {
  let i = 0;
  const document = projectFromSong(song, () => String(++i));
  const before = structuredClone(document);
  const output = importProPresenter(exportProPresenter(visualProjectSong(song.title, document)));
  assert.deepEqual(output.song.sections.flatMap(s => s.lines.map(l => l.text)), document.clips.map(c => c.text));
  assert.deepEqual(document, before);
});
