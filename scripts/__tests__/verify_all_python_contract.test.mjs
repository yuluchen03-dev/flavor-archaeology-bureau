import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (relativePath) => readFileSync(resolve(relativePath), 'utf8');
const readOptional = (relativePath) => (existsSync(resolve(relativePath)) ? read(relativePath) : '');

const verifyAllSource = read('scripts/verify-all.ps1');
const sourceCheckSource = read('scripts/source-check-deployment.ps1');
const pythonGateSource = readOptional('scripts/python-quality-gate.ps1');
const bridgeSmokeSource = readOptional('scripts/python_bridge_smoke.cjs');

test('verify-all delegates Python checks to one executable quality gate', () => {
  assert.match(verifyAllSource, /python-quality-gate\.ps1/);
  assert.doesNotMatch(verifyAllSource, /\bpython\s+-m\s+unittest/);
  assert.match(pythonGateSource, /Resolve-PythonExecutable/);
  assert.match(pythonGateSource, /Invoke-ResolvedPython/);
});

test('Python discovery honors explicit configuration then probes portable candidates in order', () => {
  const tokens = ['$env:PYTHON_BIN', '.venv', "'py'", "'-3'", "'python3'", "'python'"];
  let previousIndex = -1;
  for (const token of tokens) {
    const index = pythonGateSource.indexOf(token);
    assert.ok(index > previousIndex, `${token} should appear after the previous discovery candidate`);
    previousIndex = index;
  }
  assert.match(pythonGateSource, /sys\.executable/);
  assert.match(pythonGateSource, /sys\.version_info/);
  assert.match(pythonGateSource, /--version|Version/);
});

test('the resolved Python runs unittest, data validation, and a real PythonBridge smoke', () => {
  assert.match(pythonGateSource, /-m["']?,?\s*["']unittest["']/);
  assert.match(pythonGateSource, /service[\\/]api_wrapper\.py/);
  assert.match(pythonGateSource, /list_dishes/);
  assert.match(pythonGateSource, /\$env:PYTHON_BIN\s*=\s*\$Python\.FilePath/);
  assert.match(pythonGateSource, /python_bridge_smoke\.cjs/);
  assert.match(bridgeSmokeSource, /PythonBridge/);
  assert.match(bridgeSmokeSource, /listDishes\(\)/);
  assert.match(bridgeSmokeSource, /Array\.isArray/);
});

test('deployment source checks validate discovery and smoke wiring, not only the unittest word', () => {
  assert.match(sourceCheckSource, /scripts\/python-quality-gate\.ps1/);
  assert.match(sourceCheckSource, /PYTHON_BIN/);
  assert.match(sourceCheckSource, /sys\\?\.executable/);
  assert.match(sourceCheckSource, /api_wrapper/);
  assert.match(sourceCheckSource, /python_bridge_smoke/);
});
