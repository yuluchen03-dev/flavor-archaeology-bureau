import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSource = (relativePath) => readFileSync(resolve(__dirname, relativePath), 'utf8');

const resultSource = readSource('../Result.jsx');
const evolutionSource = readSource('../Evolution.jsx');
const lightModeSource = readSource('../LightMode.jsx');
const homeSource = readSource('../Home.jsx');
const mainSource = readSource('../../main.jsx');

test('result restore failures render recovery actions instead of an empty page', () => {
  const restoreFlow = resultSource.slice(
    resultSource.indexOf('const loadFallback'),
    resultSource.indexOf('const inputText'),
  );

  assert.match(restoreFlow, /!response\.ok\s*\|\|\s*!data\?*\.success/);
  assert.match(resultSource, /const showRequestError = \(message\) => \{[\s\S]*setError\(message\)/);
  assert.match(restoreFlow, /showRequestError\(/);
  assert.match(resultSource, /handleRetry/);
  assert.match(resultSource, /重试/);
  assert.match(resultSource, /返回输入/);
  assert.doesNotMatch(resultSource, /if \(!restoredDish\) return null;/);
});

test('result posts clues in JSON and consumes a bounded cancellable SSE stream', () => {
  const streamFlow = resultSource.slice(
    resultSource.indexOf('const startStream'),
    resultSource.indexOf("} else if (location.state?.analysisResult"),
  );

  assert.match(resultSource, /MAX_SSE_EVENT_LENGTH/);
  assert.match(resultSource, /MAX_SSE_BUFFER_LENGTH/);
  assert.match(resultSource, /SSE_FIRST_EVENT_TIMEOUT_MS/);
  assert.match(resultSource, /SSE_IDLE_TIMEOUT_MS/);
  assert.doesNotMatch(resultSource, /new EventSource/);
  assert.doesNotMatch(resultSource, /analyze-stream\?clue=/);
  assert.match(streamFlow, /fetch\(`\$\{API_BASE\}\/analyze-stream`,\s*\{[\s\S]*method:\s*['"]POST['"]/);
  assert.match(streamFlow, /body:\s*JSON\.stringify\(\{\s*clue:\s*inputText\s*\}\)/);
  assert.match(streamFlow, /signal:\s*streamController\.signal/);
  assert.match(streamFlow, /consumeSseJsonStream\(response\.body/);
  assert.match(streamFlow, /maxEventLength:\s*MAX_SSE_EVENT_LENGTH/);
  assert.match(streamFlow, /maxBufferLength:\s*MAX_SSE_BUFFER_LENGTH/);
  assert.match(resultSource, /new AbortController\(\)/);
  assert.match(resultSource, /streamController\.abort\(\)/);
  assert.match(streamFlow, /failStream\(/);
  assert.match(streamFlow, /showRequestError\(message\)/);
});

test('evolution and image generation failures are caught and recoverable', () => {
  const evolveFlow = evolutionSource.slice(
    evolutionSource.indexOf('const handleEvolve'),
    evolutionSource.indexOf('useEffect(() =>', evolutionSource.indexOf('const handleEvolve')),
  );
  const imageFlow = evolutionSource.slice(
    evolutionSource.indexOf('useEffect(() =>', evolutionSource.indexOf('const handleEvolve')),
    evolutionSource.indexOf('const evolvedFlavor'),
  );

  assert.match(evolutionSource, /const \[evolutionError, setEvolutionError\]/);
  assert.match(evolveFlow, /!response\.ok\s*\|\|\s*!data\?*\.success/);
  assert.match(evolveFlow, /catch\s*(\([^)]*\))?\s*\{[\s\S]*setEvolutionError\(/);
  assert.match(evolutionSource, /const \[imageError, setImageError\]/);
  assert.match(imageFlow, /catch\s*(\([^)]*\))?\s*\{[\s\S]*setImageError\(/);
  assert.match(evolutionSource, /handleRetryImage/);
  assert.match(evolutionSource, /role="alert"/);
});

test('light mode validates image type and size before creating a data URL', () => {
  const imageFlow = lightModeSource.slice(
    lightModeSource.indexOf('const handleImageSelect'),
    lightModeSource.indexOf('const answerState'),
  );
  const readerIndex = imageFlow.indexOf('new FileReader()');

  assert.match(lightModeSource, /SUPPORTED_IMAGE_TYPES/);
  assert.match(lightModeSource, /MAX_IMAGE_FILE_BYTES/);
  assert.ok(imageFlow.indexOf('SUPPORTED_IMAGE_TYPES.has(file.type)') < readerIndex);
  assert.ok(imageFlow.indexOf('file.size > MAX_IMAGE_FILE_BYTES') < readerIndex);
  assert.match(imageFlow, /reader\.onerror/);
});

test('light mode reports recognition failures and labels non-external recognition as degraded', () => {
  const ancestorFlow = lightModeSource.slice(
    lightModeSource.indexOf('const handleAncestor'),
    lightModeSource.indexOf('const handleImageSelect'),
  );

  assert.doesNotMatch(ancestorFlow, /setAncestor\(localLightModeDemo\.ancestor\)/);
  assert.match(ancestorFlow, /catch\s*(\([^)]*\))?\s*\{[\s\S]*setError\(/);
  assert.match(lightModeSource, /const \[ancestorMode, setAncestorMode\]/);
  assert.match(lightModeSource, /ancestorMode === 'degraded'/);
  assert.match(lightModeSource, /degradedRecognition/);
});

test('main leaves runtime errors visible to the error boundary and diagnostics', () => {
  assert.doesNotMatch(mainSource, /window\.addEventListener\(['"]error['"]/);
  assert.doesNotMatch(mainSource, /getBoundingClientRect/);
  assert.doesNotMatch(mainSource, /preventDefault\(\)/);
});

test('home defers the below-fold signature image with stable intrinsic dimensions', () => {
  assert.match(
    homeSource,
    /src=\{crabOrangeImage\}[^>]*loading="lazy"[^>]*decoding="async"[^>]*width=\{1152\}[^>]*height=\{864\}/s,
  );
});
