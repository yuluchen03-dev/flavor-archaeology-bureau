import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  canUseSpeechNarration,
  playSpeechNarration,
  stopSpeechNarration,
} from '../speechNarration.js';

const hadWindow = Object.hasOwn(global, 'window');
const originalWindow = global.window;

afterEach(() => {
  if (hadWindow) {
    global.window = originalWindow;
    return;
  }

  delete global.window;
});

test('reports unsupported when speech synthesis is absent', () => {
  delete global.window;

  assert.equal(canUseSpeechNarration(), false);
  assert.doesNotThrow(() => stopSpeechNarration());
  assert.doesNotThrow(() => {
    assert.equal(playSpeechNarration({ text: 'narrate this' }), false);
  });
});

test('plays and stops browser speech narration when supported', () => {
  const spoken = [];
  const events = [];

  global.window = {
    SpeechSynthesisUtterance: class SpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      cancel() {
        events.push('cancel');
      },
      speak(utterance) {
        events.push('speak');
        spoken.push(utterance);
      },
    },
  };

  assert.equal(canUseSpeechNarration(), true);
  assert.equal(
    playSpeechNarration({
      text: '我看见了蟹与橙的线索。',
      language: 'zh-CN',
      rate: 0.95,
      pitch: 1.05,
    }),
    true,
  );

  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, '我看见了蟹与橙的线索。');
  assert.equal(spoken[0].lang, 'zh-CN');
  assert.equal(spoken[0].rate, 0.95);
  assert.equal(spoken[0].pitch, 1.05);
  assert.deepEqual(events, ['cancel', 'speak']);

  stopSpeechNarration();

  assert.deepEqual(events, ['cancel', 'speak', 'cancel']);
});

test('does not speak blank or non-string text', () => {
  const spoken = [];

  global.window = {
    SpeechSynthesisUtterance: class SpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      cancel() {},
      speak(utterance) {
        spoken.push(utterance);
      },
    },
  };

  assert.equal(playSpeechNarration({ text: '   ' }), false);
  assert.equal(playSpeechNarration({ text: { clue: '蟹与橙' } }), false);
  assert.equal(spoken.length, 0);

});

test('speaks without throwing when cancel is missing', () => {
  const spoken = [];

  global.window = {
    SpeechSynthesisUtterance: class SpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      speak(utterance) {
        spoken.push(utterance);
      },
    },
  };

  assert.doesNotThrow(() => stopSpeechNarration());
  assert.doesNotThrow(() => {
    assert.equal(playSpeechNarration({ text: 'hi' }), true);
  });
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, 'hi');
});

test('does not throw or speak when speak is missing', () => {
  let cancelCount = 0;

  global.window = {
    SpeechSynthesisUtterance: class SpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      cancel() {
        cancelCount += 1;
      },
    },
  };

  assert.equal(canUseSpeechNarration(), false);
  assert.doesNotThrow(() => {
    assert.equal(playSpeechNarration({ text: 'hi' }), false);
  });
  assert.equal(cancelCount, 0);
});

test('reports unsupported when utterance constructor is not a function', () => {
  global.window = {
    SpeechSynthesisUtterance: {},
    speechSynthesis: {
      speak() {},
    },
  };

  assert.equal(canUseSpeechNarration(), false);
  assert.doesNotThrow(() => {
    assert.equal(playSpeechNarration({ text: 'hi' }), false);
  });
});

test('reports unsupported when utterance function is not constructible', () => {
  global.window = {
    SpeechSynthesisUtterance: () => {},
    speechSynthesis: {
      speak() {},
    },
  };

  assert.equal(canUseSpeechNarration(), false);
  assert.doesNotThrow(() => {
    assert.equal(playSpeechNarration({ text: 'hi' }), false);
  });
});
