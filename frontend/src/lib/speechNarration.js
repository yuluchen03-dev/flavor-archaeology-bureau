function isConstructible(value) {
  if (typeof value !== 'function') {
    return false;
  }

  try {
    Reflect.construct(String, [], value);
    return true;
  } catch {
    return false;
  }
}

export function canUseSpeechNarration() {
  return Boolean(
    typeof window !== 'undefined'
      && window.speechSynthesis
      && typeof window.speechSynthesis.speak === 'function'
      && isConstructible(window.SpeechSynthesisUtterance),
  );
}

export function stopSpeechNarration() {
  if (
    canUseSpeechNarration()
    && typeof window.speechSynthesis.cancel === 'function'
  ) {
    window.speechSynthesis.cancel();
  }
}

export function playSpeechNarration({
  text = '',
  language = 'zh-CN',
  rate = 0.95,
  pitch = 1.05,
} = {}) {
  if (!canUseSpeechNarration()) {
    return false;
  }

  if (typeof text !== 'string' || text.trim() === '') {
    return false;
  }

  if (typeof window.speechSynthesis.speak !== 'function') {
    return false;
  }

  stopSpeechNarration();

  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = language || 'zh-CN';
  utterance.rate = rate;
  utterance.pitch = pitch;

  window.speechSynthesis.speak(utterance);

  return true;
}
