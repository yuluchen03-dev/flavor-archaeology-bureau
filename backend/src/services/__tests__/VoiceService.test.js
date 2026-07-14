const VoiceService = require('../VoiceService');

describe('VoiceService', () => {
  test('builds a browser TTS cue for narration text', () => {
    expect(VoiceService.buildVoiceCue({
      script: '我看见了蟹与橙的线索。',
      speaker: { id: 'taotie-curator', name: '饕餮考古官' },
      emotion: 'curious',
    })).toEqual({
      mode: 'browser-tts',
      language: 'zh-CN',
      voiceName: 'zh-CN',
      rate: 0.95,
      pitch: 1.05,
      text: '我看见了蟹与橙的线索。',
      audioUrl: null,
      speakerId: 'taotie-curator',
      emotion: 'curious',
    });
  });

  test('uses safe defaults for sparse or malformed inputs', () => {
    expect(() => VoiceService.buildVoiceCue(null)).not.toThrow();

    const sparseCue = VoiceService.buildVoiceCue(null);
    expect(sparseCue.text).toBe('');
    expect(sparseCue.speakerId).toBe('taotie-curator');
    expect(sparseCue.emotion).toBe('curious');

    const nullSpeakerCue = VoiceService.buildVoiceCue({ speaker: null, emotion: '' });
    expect(nullSpeakerCue.speakerId).toBe('taotie-curator');
    expect(nullSpeakerCue.emotion).toBe('curious');

    const malformedSpeakerCue = VoiceService.buildVoiceCue({ speaker: 'bad' });
    expect(malformedSpeakerCue.speakerId).toBe('taotie-curator');

    const malformedFieldCue = VoiceService.buildVoiceCue({ speaker: { id: 123 }, emotion: {} });
    expect(malformedFieldCue.speakerId).toBe('taotie-curator');
    expect(malformedFieldCue.emotion).toBe('curious');

    const trimmedCue = VoiceService.buildVoiceCue({ speaker: { id: ' curator ' }, emotion: ' calm ' });
    expect(trimmedCue.speakerId).toBe('curator');
    expect(trimmedCue.emotion).toBe('calm');

    const blankFieldCue = VoiceService.buildVoiceCue({ speaker: { id: '   ' }, emotion: '   ' });
    expect(blankFieldCue.speakerId).toBe('taotie-curator');
    expect(blankFieldCue.emotion).toBe('curious');

    const objectScriptCue = VoiceService.buildVoiceCue({ script: { clue: 'crab-orange' } });
    expect(objectScriptCue.text).toBe('');
    expect(objectScriptCue.text).not.toBe('[object Object]');
  });
});
