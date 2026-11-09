/** A whole line must be a heading; words inside a sung phrase are preserved. */
export function getSectionHeading(text: string): string | null {
  const line = text.trim();
  const bracketed = /^\[([^\]]{1,100})\]\s*:?$/u.exec(line);
  if (bracketed) return bracketed[1].trim() || null;
  const label = line.replace(/^\((.*)\)\s*:?$/u, '$1').replace(/:\s*$/u, '').trim();
  const normalized = label.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[‐‑‒–—−]/gu, '-');
  return /^(?:verso|estrofe|pre[\s-]*refrao|refrao|tag|instrumental|preludio|ponte|introducao|intro|final|outro)(?:\s*\d+)?$/u.test(normalized) ? label : null;
}
