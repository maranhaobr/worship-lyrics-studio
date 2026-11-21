/** Exact normalized words, never substring matching or rewriting the stored lyric. */
export function normalizeEmphasisWord(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLocaleLowerCase('pt-BR');
}
export function isEmphasizedWord(word: string, keywords: readonly string[]): boolean {
  const normalized = normalizeEmphasisWord(word);
  return Boolean(normalized) && keywords.some(keyword => normalizeEmphasisWord(keyword) === normalized);
}
