import assert from 'node:assert/strict';
import test from 'node:test';
import messages from '../apps/web/src/lib/i18n/messages.json';
import { parseLocale, parseTheme, translator } from '../apps/web/src/lib/i18n';
test('locales and themes accept only supported preferences', () => {
  assert.equal(parseLocale('en'), 'en'); assert.equal(parseLocale('es'), 'es'); assert.equal(parseLocale('arbitrary'), 'pt');
  assert.equal(parseTheme('dark'), 'dark'); assert.equal(parseTheme('invalid'), 'light');
});
test('translations preserve spacing and never modify unknown content', () => {
  assert.equal(translator('pt')('Texto'), 'Texto'); assert.equal(translator('en')('Texto'), 'Text'); assert.equal(translator('es')('Texto'), 'Texto');
  assert.equal(translator('en')(' Texto '), ' Text '); assert.equal(translator('en')('Minha canção original'), 'Minha canção original');
  assert.equal(translator('es')('Personalizar visual'), 'Personalizar diseño');
});
test('every catalog entry includes English and Spanish', () => {
  for (const [key, value] of Object.entries(messages)) { assert.ok(key.trim()); assert.ok(value.en.trim(), key); assert.ok(value.es.trim(), key); }
});
