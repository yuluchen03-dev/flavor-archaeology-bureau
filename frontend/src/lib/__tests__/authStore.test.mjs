import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAuth,
  shouldLoadCurrentUser,
  getAuthToken,
  getStoredUser,
  setAuthSession,
} from '../authStore.js';

// 不设置 global.localStorage：authStore 已迁移到 httpOnly cookie，
// 不再依赖 localStorage；此处仅用于验证函数在浏览器/Node 环境均可调用。

test('getAuthToken returns empty string (no localStorage persistence)', () => {
  assert.equal(getAuthToken(), '');
});

test('shouldLoadCurrentUser returns true (cookie path)', () => {
  assert.equal(shouldLoadCurrentUser(), true);
});

test('getStoredUser returns null (no localStorage persistence)', () => {
  assert.equal(getStoredUser(), null);
});

test('setAuthSession is a no-op (backward compatible)', () => {
  setAuthSession({ token: 'token-123', user: { id: 1, username: 'tester' } });
  assert.equal(getAuthToken(), '');
  assert.equal(getStoredUser(), null);
});

test('clearAuth is a no-op (backward compatible)', () => {
  clearAuth(); // should not throw
  assert.equal(getAuthToken(), '');
});
