import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resultSource = readFileSync(resolve(__dirname, '../Result.jsx'), 'utf8');

test('result image generation sends dish-specific visual facts for restoration images', () => {
  assert.match(resultSource, /imagePromptHints/);
  assert.match(resultSource, /buildRestorationImagePrompt/);
  assert.match(resultSource, /厚皮黄橙或甜橙作为橙盅容器/);
  assert.match(resultSource, /不得出现整只螃蟹/);
  assert.match(resultSource, /不得出现蟹腿、蟹钳、蟹壳或完整蟹身轮廓/);
  assert.match(resultSource, /可见的蟹只能是拆出的蟹肉丝和蟹黄蟹膏/);
  assert.match(resultSource, /不要把螃蟹当主菜/);
  assert.match(resultSource, /buildRestorationImagePrompt\(restoredDish\)/);
  assert.doesNotMatch(resultSource, /const prompt = `\$\{restoredDish\.name\} \$\{restoredDish\.dynasty \|\| ''\} 复原成品图`/);
});
