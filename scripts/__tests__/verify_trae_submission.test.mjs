import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSubmission } from '../verify_trae_submission.mjs';

const validManifest = {
  demoHtml: 'release/风味考古局-TRAE初赛/风味考古局-离线体验.html',
  demoZip: 'release/风味考古局-TRAE初赛.zip',
  postDraft: 'docs/competition/trae-initial-round-post.md',
  registrationUrl: 'https://forum.trae.cn/t/topic/12345',
  traeTasks: [
    { key: 'trae-01', sessionId: 'a1b2c3d4', screenshots: ['docs/competition/screenshots/trae-01-prompt.png'] },
    { key: 'trae-02', sessionId: 'e5f6g7h8', screenshots: ['docs/competition/screenshots/trae-02-prompt.png'] },
    { key: 'trae-03', sessionId: 'i9j0k1l2', screenshots: ['docs/competition/screenshots/trae-03-prompt.png'] },
  ],
};

test('empty manifest is not ready', () => {
  const emptyManifest = {
    demoHtml: '', demoZip: '', postDraft: '', registrationUrl: '',
    traeTasks: [
      { key: 'trae-01', sessionId: '', screenshots: [] },
      { key: 'trae-02', sessionId: '', screenshots: [] },
      { key: 'trae-03', sessionId: '', screenshots: [] },
    ],
  };
  const result = evaluateSubmission(emptyManifest);
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes('报名帖链接'));
});

test('placeholder registration url is not ready', () => {
  const result = evaluateSubmission({ ...validManifest, registrationUrl: '【待补】' });
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes('报名帖链接'));
});

test('valid registration url is not flagged as missing', () => {
  // 注意：这个测试需要 validManifest 引用的文件实际存在
  // 由于 screenshots 文件可能不存在，这个测试主要验证逻辑
  const result = evaluateSubmission(validManifest);
  // 至少 registrationUrl 验证通过
  assert.equal(result.missing.includes('报名帖链接'), false);
});

test('placeholder session id is flagged as missing', () => {
  const manifest = {
    ...validManifest,
    traeTasks: [
      { key: 'trae-01', sessionId: 'TODO', screenshots: ['docs/competition/screenshots/trae-01-prompt.png'] },
      { key: 'trae-02', sessionId: 'e5f6g7h8', screenshots: ['docs/competition/screenshots/trae-02-prompt.png'] },
      { key: 'trae-03', sessionId: 'i9j0k1l2', screenshots: ['docs/competition/screenshots/trae-03-prompt.png'] },
    ],
  };
  const result = evaluateSubmission(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.missing.some((m) => m.includes('trae-01') && m.includes('Session ID')));
});

test('duplicate session ids are flagged as missing', () => {
  const manifest = {
    ...validManifest,
    traeTasks: [
      { key: 'trae-01', sessionId: 'same-id', screenshots: ['docs/competition/screenshots/trae-01-prompt.png'] },
      { key: 'trae-02', sessionId: 'same-id', screenshots: ['docs/competition/screenshots/trae-02-prompt.png'] },
      { key: 'trae-03', sessionId: 'i9j0k1l2', screenshots: ['docs/competition/screenshots/trae-03-prompt.png'] },
    ],
  };
  const result = evaluateSubmission(manifest);
  assert.equal(result.ready, false);
  assert.ok(result.missing.some((m) => m.includes('Session ID') && m.includes('互不相同')));
});
