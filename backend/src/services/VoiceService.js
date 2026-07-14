class VoiceService {
  static buildVoiceCue(input = {}) {
    const cueInput = input && typeof input === 'object' ? input : {};
    const { script, speaker, emotion } = cueInput;
    const safeSpeaker = speaker && typeof speaker === 'object' ? speaker : {};
    const speakerId = typeof safeSpeaker.id === 'string' ? safeSpeaker.id.trim() : '';
    const safeEmotion = typeof emotion === 'string' ? emotion.trim() : '';

    return {
      mode: 'browser-tts',
      language: 'zh-CN',
      voiceName: 'zh-CN',
      rate: 0.95,
      pitch: 1.05,
      text: typeof script === 'string' ? script : '',
      audioUrl: null,
      speakerId: speakerId || 'taotie-curator',
      emotion: safeEmotion || 'curious',
    };
  }
}

module.exports = VoiceService;
