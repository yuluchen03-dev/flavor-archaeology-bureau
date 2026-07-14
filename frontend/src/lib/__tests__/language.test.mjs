import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const languageSource = readFileSync(resolve(__dirname, '../language.jsx'), 'utf8');
const layoutSource = readFileSync(resolve(__dirname, '../../components/Layout.jsx'), 'utf8');

test('language module exposes bilingual state and Chinese text sanitization', () => {
  assert.match(languageSource, /LanguageProvider/);
  assert.match(languageSource, /useLanguage/);
  assert.match(languageSource, /sanitizeChineseText/);
  assert.match(languageSource, /replaceLatinText/);
  assert.match(languageSource, /localStorage/);
});

test('layout renders a global language toggle and mounts Chinese text guard', () => {
  assert.match(layoutSource, /LanguageToggle/);
  assert.match(layoutSource, /ChineseTextGuard/);
  assert.match(layoutSource, /useLanguage/);
});
