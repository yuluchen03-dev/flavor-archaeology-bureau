import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_SESSION,
  museumSessionReducer,
  persistentSession,
} from '../state/museumSession.js';

test('selecting a dish is shared without changing the active exhibit', () => {
  const state = museumSessionReducer(INITIAL_SESSION, {
    type: 'selectDish',
    dishId: 'dish_012',
  });
  assert.equal(state.selectedDishId, 'dish_012');
  assert.equal(state.activeExhibit, 'home');
});

test('opening evidence records coverage without duplicates', () => {
  const once = museumSessionReducer(INITIAL_SESSION, {
    type: 'selectEvidence',
    evidenceId: 'hotspot_shell',
  });
  const twice = museumSessionReducer(once, {
    type: 'selectEvidence',
    evidenceId: 'hotspot_shell',
  });
  assert.deepEqual(twice.viewedEvidenceIds, ['hotspot_shell']);
});

test('reset to home keeps selected dish but clears transient restoration state', () => {
  const dirty = {
    ...INITIAL_SESSION,
    selectedDishId: 'dish_008',
    activeExhibit: 'restore',
    stage: 4,
    selectedEvidenceId: 'hotspot_shell',
  };
  const reset = museumSessionReducer(dirty, { type: 'returnHome' });
  assert.equal(reset.activeExhibit, 'home');
  assert.equal(reset.selectedDishId, 'dish_008');
  assert.equal(reset.stage, 0);
  assert.equal(reset.selectedEvidenceId, null);
});

test('persistence excludes clue text and uploaded image state', () => {
  const stored = persistentSession({
    ...INITIAL_SESSION,
    clueText: 'private clue',
    uploadedImageUrl: 'blob:private',
  });
  assert.equal(stored.clueText, undefined);
  assert.equal(stored.uploadedImageUrl, undefined);
  assert.equal(stored.selectedDishId, 'dish_001');
});
