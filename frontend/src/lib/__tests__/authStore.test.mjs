import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAuth,
  shouldLoadCurrentUser,
  getAuthToken,
  getStoredUser,
  setAuthSession,
} from '../authStore.js';

global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
};

test('stores and clears auth token and user', () => {
  clearAuth();
  setAuthSession({ token: 'token-123', user: { id: 1, username: 'tester' } });

  assert.equal(getAuthToken(), 'token-123');
  assert.deepEqual(getStoredUser(), { id: 1, username: 'tester' });

  clearAuth();
  assert.equal(getAuthToken(), '');
  assert.equal(getStoredUser(), null);
});

test('loads current user only when an auth token exists', () => {
  clearAuth();
  assert.equal(shouldLoadCurrentUser(), false);

  setAuthSession({ token: 'token-123', user: null });
  assert.equal(shouldLoadCurrentUser(), true);
});
