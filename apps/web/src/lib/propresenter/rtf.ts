const destinations = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'header', 'footer', 'fldinst', 'listtable', 'listoverridetable', 'generator', 'xmlnstbl', 'datastore', 'themedata', 'colorschememapping']);

/** RTF text only. No objects, links, embedded files or control actions are executed. */
export function rtfToText(bytes: Uint8Array): string {
  const source = Buffer.from(bytes).toString('latin1');
  if (!source.startsWith('{\\rtf')) throw new Error('Formato de texto RTF não reconhecido em um slide.');
  let state = { skip: false, uc: 1 }, fallback = 0, codepage = 'windows-1252';
  const stack: typeof state[] = [];
  let result = '';
  const emit = (text: string) => {
    if (state.skip) return;
    if (fallback) { const skip = Math.min(fallback, text.length); fallback -= skip; text = text.slice(skip); }
    result += text;
    if (result.length > 100_000) throw new Error('O texto de um slide excede o limite permitido.');
  };
  for (let i = 0; i < source.length;) {
    const ch = source[i++];
    if (ch === '{') { if (stack.length >= 256) throw new Error('RTF com grupos excessivamente aninhados.'); stack.push({ ...state }); continue; }
    if (ch === '}') { const previous = stack.pop(); if (!previous) throw new Error('RTF inválido.'); state = previous; continue; }
    if (ch === '\r' || ch === '\n') continue;
    if (ch !== '\\') { emit(new TextDecoder(codepage).decode(Uint8Array.of(ch.charCodeAt(0)))); continue; }
    const control = source[i++];
    if (control === "'") {
      const hex = source.slice(i, i + 2); if (!/^[0-9a-f]{2}$/i.test(hex)) throw new Error('Escape inválido no RTF.');
      emit(new TextDecoder(codepage).decode(Uint8Array.of(parseInt(hex, 16)))); i += 2; continue;
    }
    if (control === '\\' || control === '{' || control === '}') { emit(control); continue; }
    if (control === '*') { state.skip = true; continue; }
    if (control === '~') { emit(' '); continue; }
    if (control === '_') { emit('-'); continue; }
    if (!control || !/[a-z]/i.test(control)) continue;
    const match = /^[a-z]+(-?\d+)? ?/i.exec(source.slice(i - 1));
    if (!match) throw new Error('Controle RTF inválido.');
    const word = /^[a-z]+/i.exec(match[0])![0];
    const number = match[1] === undefined ? undefined : Number(match[1]);
    i = i - 1 + match[0].length;
    if (destinations.has(word)) state.skip = true;
    if (word === 'ansicpg' && number !== undefined) {
      if (![1252, 10000].includes(number)) throw new Error('Codificação RTF não suportada. Exporte a letra em Unicode ou Windows-1252.');
      codepage = number === 10000 ? 'macintosh' : 'windows-1252';
    }
    if (word === 'uc' && number !== undefined) state.uc = Math.max(0, Math.min(16, number));
    if (word === 'u' && number !== undefined && !state.skip) { fallback = 0; emit(String.fromCharCode(number & 0xffff)); fallback = state.uc; }
    if (word === 'par' || word === 'line') emit('\n');
    if (word === 'tab') emit(' ');
    if (word === 'emdash') emit('—');
    if (word === 'endash') emit('–');
    if (word === 'bin' && number !== undefined) { if (number < 0 || number > source.length - i) throw new Error('RTF binário inválido.'); i += number; }
  }
  if (stack.length) throw new Error('RTF incompleto.');
  return result.replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
}

export function textToRtf(text: string): Uint8Array {
  let encoded = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i], code = text.charCodeAt(i);
    encoded += char === '\n' ? '\\par\n' : char === '\r' ? '' : /[\\{}]/.test(char) ? `\\${char}` : code > 126 ? `\\u${code > 32767 ? code - 65536 : code}?` : code < 32 ? ' ' : char;
  }
  return Buffer.from(`{\\rtf1\\ansi\\ansicpg1252\\uc1{\\fonttbl{\\f0 Arial;}}{\\colortbl;\\red255\\green255\\blue255;}\\f0\\fs120\\cf1\\qc ${encoded}}`, 'ascii');
}
