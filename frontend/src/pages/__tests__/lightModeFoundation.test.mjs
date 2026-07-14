import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lightModeSource = readFileSync(resolve(__dirname, '../LightMode.jsx'), 'utf8');

test('light mode uses authenticated API client and image data for ancestor recognition', () => {
  assert.match(lightModeSource, /import\s+\{\s*apiRequest\s*\}\s+from\s+['"]\.\.\/lib\/apiClient['"]/);
  assert.match(lightModeSource, /readAsDataURL\(file\)/);
  assert.match(lightModeSource, /imageData/);
  assert.doesNotMatch(lightModeSource, /fetch\(\s*`\$\{API_BASE\}\/light/);
});

test('light mode renders vision evidence, draw economy, and platform share intents', () => {
  assert.match(lightModeSource, /ancestor\.vision/);
  assert.match(lightModeSource, /daily\.draws/);
  assert.match(lightModeSource, /platformIntents/);
  assert.match(lightModeSource, /xiaohongshu/);
  assert.match(lightModeSource, /douyin/);
});

test('light mode renders digital human narration and browser voice controls', () => {
  assert.match(lightModeSource, /digitalHuman/);
  assert.match(lightModeSource, /ancestor\.digitalHuman/);
  assert.match(lightModeSource, /playSpeechNarration/);
  assert.match(lightModeSource, /stopSpeechNarration/);
  assert.match(lightModeSource, /canUseSpeechNarration/);
  assert.match(lightModeSource, /DIGITAL HUMAN/);
  assert.match(lightModeSource, /VOICE/);
  assert.match(lightModeSource, /Provider Status/);
});
