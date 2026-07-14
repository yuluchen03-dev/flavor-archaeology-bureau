import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputSource = readFileSync(resolve(__dirname, '../Input.jsx'), 'utf8');
const resultSource = readFileSync(resolve(__dirname, '../Result.jsx'), 'utf8');
const teachingSource = readFileSync(resolve(__dirname, '../Teaching.jsx'), 'utf8');
const notFoundSource = readFileSync(resolve(__dirname, '../NotFound.jsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

test('input page renders as an archive intake desk with structured clue controls', () => {
  for (const className of ['clue-desk', 'clue-type-switch', 'archive-surface', 'evidence-panel', 'museum-button']) {
    assert.match(inputSource, new RegExp(className), `Input should use ${className}`);
  }
  assert.doesNotMatch(inputSource, /icon:\s*['"][^'"]*[\u{1F300}-\u{1FAFF}]/u);
});

test('result page renders as a restoration gallery rather than plain result cards', () => {
  for (const className of ['restoration-gallery', 'dish-showcase', 'share-certificate', 'archive-surface', 'evidence-panel']) {
    assert.match(resultSource, new RegExp(className), `Result should use ${className}`);
  }
  assert.doesNotMatch(resultSource, /bg-gradient-to-br from-cinnabar\/10 to-tea-gold\/10/);
});

test('teaching page renders as a mentor studio with an archive chat surface', () => {
  for (const className of ['mentor-studio', 'mentor-profile', 'dialogue-scroll', 'archive-surface', 'evidence-panel']) {
    assert.match(teachingSource, new RegExp(className), `Teaching should use ${className}`);
  }
});

test('not found page participates in the museum visual system', () => {
  assert.match(notFoundSource, /lost-archive/);
  assert.match(notFoundSource, /archive-surface/);
  assert.match(notFoundSource, /museum-button/);
});

test('global styles include remaining page semantic visual classes', () => {
  for (const className of ['clue-desk', 'clue-type-switch', 'restoration-gallery', 'dish-showcase', 'mentor-studio', 'mentor-profile', 'dialogue-scroll', 'lost-archive']) {
    assert.match(stylesSource, new RegExp(`\\.${className}\\b`), `missing .${className}`);
  }
});
