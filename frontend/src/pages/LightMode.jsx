import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';
import { sanitizeChineseText, useLanguage } from '../lib/language.jsx';
import { isJudgeModeLocation } from '../lib/judgeMode';
import {
  canUseSpeechNarration,
  playSpeechNarration,
  stopSpeechNarration,
} from '../lib/speechNarration';

const copySet = {
  zh: {
    heroEyebrow: '轻量玩法｜公众体验',
    heroTitle: '拍照认祖，证据可见，一键复活',
    heroSubtitle: '拍照认祖、每日复活、真假非遗与分享证书，适合评委和观众快速上手。',
    ancestorEyebrow: '拍照认祖｜图像优先识别',
    ancestorTitle: '这顿饭的祖先是谁？',
    uploadEyebrow: '上传｜相机或文件',
    chooseImage: '选择一张食物图片',
    uploadHelp: '后端会读取图片、文件名和描述，并给出可信的视觉证据。',
    previewAlt: '待识别的食物预览',
    defaultDescription: '一份带有清亮橙香的蟹粉面午餐。',
    sampleAncestorDescription: '一份橙香蟹粉拌面，蟹黄丰润，带一点米醋和黄酒香气。',
    emptyDescription: '我拍到了一道菜，请识别它的祖先菜。',
    placeholder: '描述食物，或粘贴识别线索，例如：蟹粉面、菌菇豆腐汤、炙羊肉。',
    loading: '正在追溯风味线索...',
    identify: '识别祖先菜',
    loadQuizError: '真假非遗题目加载失败，请重试。',
    loadPageError: '轻量玩法加载失败，请重试。',
    ancestorError: '祖先菜识别失败。',
    backendError: '无法连接后端服务。',
    cardEyebrow: '分享卡｜风味证书',
    certificate: '证书',
    seal: '风味印',
    copyShare: '复制分享文案',
    copied: '已复制',
    copyFailed: '复制失败',
    copyPlatform: (name) => `复制${name}文案`,
    collection: '收藏',
    visionEyebrow: '视觉｜图像证据',
    provider: '来源',
    confidence: '可信度',
    providerStatus: '服务状态',
    externalProvider: '外部视觉模型',
    fallbackProvider: '本地证据',
    fallbackHint: '当前使用本地证据；配置视觉模型密钥后可优先进行真实图像分析。',
    digitalEyebrow: '数字传承人｜风味讲述',
    guide: '风味向导',
    voice: '语音',
    externalAudio: '外部音频',
    browserVoice: '浏览器朗读',
    playNarration: '播放讲述',
    stopNarration: '停止',
    speechUnavailable: '当前浏览器不可朗读，讲述文本仍可阅读。',
    dailyEyebrow: '每日复活｜今日',
    dailyDraws: (used, limit, remaining) => `今日抽卡 ${used}/${limit}｜剩余 ${remaining}`,
    dailyLoading: '正在加载今日复活...',
    drawDaily: '抽一张',
    drawAgain: '再抽一张',
    drawLoading: '抽卡中...',
    noDraws: '今日次数已用完',
    quizEyebrow: '真假非遗｜考据问答',
    quizTitle: '把智能幻觉变成饮食史素养',
    nextRound: '下一题',
    correct: '答对了',
    wrong: '识破虚构菜',
  },
  en: {
    heroEyebrow: 'LIGHT MODE | Public experience',
    heroTitle: 'Photo, proof, and a shareable revival',
    heroSubtitle: 'Photo ancestry, daily revival, authenticity quiz, and platform-ready certificate cards.',
    ancestorEyebrow: 'PHOTO ANCESTOR | Image-first recognition',
    ancestorTitle: 'Who is this meal descended from?',
    uploadEyebrow: 'UPLOAD | Camera or file',
    chooseImage: 'Choose a food image',
    uploadHelp: 'The backend reads image data, file label, and description, then reports honest VISION evidence.',
    previewAlt: 'Food preview awaiting recognition',
    defaultDescription: 'A crab noodle lunch with a clear orange fragrance.',
    sampleAncestorDescription: 'A crab roe noodle dish with orange aroma, a little rice vinegar, and Shaoxing wine fragrance.',
    emptyDescription: 'I photographed this meal; identify its culinary ancestor.',
    placeholder: 'Describe the food or paste recognition clues, for example: crab noodles, mushroom tofu soup, roasted lamb...',
    loading: 'Reading the flavor trail...',
    identify: 'Identify ancestor',
    loadQuizError: 'Failed to load the authenticity round. Please try again.',
    loadPageError: 'Light mode failed to load. Please try again.',
    ancestorError: 'Ancestor recognition failed.',
    backendError: 'Could not reach the backend service.',
    cardEyebrow: 'SHARE CARD | Flavor Certificate',
    certificate: 'CERTIFICATE',
    seal: 'Flavor Seal',
    copyShare: 'Copy share text',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    copyPlatform: (name) => `Copy ${name}`,
    collection: 'Collection',
    visionEyebrow: 'VISION | Image evidence',
    provider: 'Provider',
    confidence: 'Confidence',
    providerStatus: 'Provider Status',
    externalProvider: 'external VLM',
    fallbackProvider: 'fallback evidence',
    fallbackHint: 'Local fallback is active; configure a VLM key to prioritize real visual model analysis.',
    digitalEyebrow: 'DIGITAL HUMAN | Flavor narrator',
    guide: 'Flavor Guide',
    voice: 'VOICE',
    externalAudio: 'external audio',
    browserVoice: 'browser TTS',
    playNarration: 'Play narration',
    stopNarration: 'Stop',
    speechUnavailable: 'Speech synthesis is unavailable in this browser; the narration text remains readable.',
    dailyEyebrow: 'DAILY REVIVAL | Today',
    dailyDraws: (used, limit, remaining) => `Daily draws ${used}/${limit} | Remaining ${remaining}`,
    dailyLoading: 'Loading daily revival...',
    drawDaily: 'Draw a card',
    drawAgain: 'Draw again',
    drawLoading: 'Drawing...',
    noDraws: 'No draws left today',
    quizEyebrow: 'TRUE OR FAKE | Authenticity quiz',
    quizTitle: 'Turn AI fantasy into food-history literacy',
    nextRound: 'Next round',
    correct: 'Correct',
    wrong: 'Caught by a fantasy dish',
  },
};

const platformNames = {
  zh: {
    xiaohongshu: '小红书',
    douyin: '抖音',
  },
  en: {
    xiaohongshu: 'Xiaohongshu',
    douyin: 'Douyin',
  },
};

const localLightModeDemo = {
  daily: {
    dish: {
      id: 'dish_001',
      name: '蟹酿橙',
      dynasty: '南宋',
    },
    confidence: 92,
    rarity: '馆藏样例',
    unlockText: '本地演示数据：以蟹酿橙展示每日复活卡，保证现场无后端时仍能完成公众体验说明。',
    draws: { usedToday: 1, limit: 3, remaining: 2 },
    collection: { constellation: '宋代雅宴', starId: 'SONG-001' },
    shareCard: {
      title: '今日复活：南宋蟹酿橙',
      subtitle: '一盏橙香蟹鲜，来自本地演示数据。',
      badges: ['本地演示数据', '可分享', '证据可见'],
      certificateId: 'LOCAL-LIGHT-CRAB-001',
      shareText: '我抽到了风味考古局本地演示卡：南宋蟹酿橙。',
    },
  },
  quiz: {
    question: '哪一道更像有文献线索支持的历史风味？',
    answerId: 'real',
    options: [
      {
        id: 'real',
        name: '蟹酿橙',
        dynasty: '南宋',
        source: '《山家清供》',
        description: '以黄熟橙为器，填入蟹膏蟹肉蒸制。',
        isReal: true,
      },
      {
        id: 'fake',
        name: '琉璃星云鸭',
        dynasty: '唐代',
        source: '未见可靠出处',
        description: '名称华丽但缺少可核验食材、技法和文献定位。',
        isReal: false,
      },
    ],
    explanation: '蟹酿橙有明确古籍短摘和技法线索；虚构菜名缺少可追溯证据。',
    shareCard: {
      title: '我识破了一道虚构菜',
      subtitle: '证据链比华丽名字更重要。',
      badges: ['真假非遗', '本地演示数据'],
      certificateId: 'LOCAL-QUIZ-001',
      shareText: '我在风味考古局识别了真假历史菜。',
    },
  },
  ancestor: {
    ancestor: {
      id: 'dish_001',
      name: '蟹酿橙',
      dynasty: '南宋',
    },
    confidence: 86,
    rarity: '近亲识别',
    story: '本地演示数据：橙香、蟹粉、米醋和黄酒线索共同指向蟹酿橙谱系。',
    taotieComment: '证据不足时不会硬编；当前仅作为本地演示识别结果。',
    collection: { constellation: '宋代雅宴', starId: 'SONG-001' },
    vision: {
      provider: 'fallback',
      confidence: 0.74,
      labels: ['橙香', '蟹粉', '米醋', '黄酒'],
      evidence: ['本地演示数据：根据描述文本匹配蟹酿橙关键线索。'],
    },
    digitalHuman: {
      speaker: { name: '宋味讲述人', role: '风味传承向导' },
      headline: '先看证据，再讲故事',
      script: '这份本地演示结果保留了低风险解释路径：它说明为什么像蟹酿橙，也说明这不是实时视觉模型输出。',
      evidenceBullets: ['橙作为容器', '蟹粉与蟹黄', '酒醋蒸制'],
    },
    voice: {
      mode: 'browser-tts',
      text: '这是一份本地演示数据，用来保证现场体验不中断。',
    },
    shareCard: {
      title: '我找到了一份蟹酿橙近亲',
      subtitle: '本地演示数据，证据路径可见。',
      badges: ['拍照认祖', '本地演示数据'],
      certificateId: 'LOCAL-ANCESTOR-001',
      shareText: '风味考古局用本地演示数据识别了蟹酿橙近亲。',
    },
  },
};

const safeId = (value, language) => (language === 'zh' ? '本地证书' : value);
const safeText = (value, language, fallback = '本地记录') => (
  language === 'zh' ? sanitizeChineseText(value, fallback) : value
);

const copyToClipboard = async (text) => {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Continue to the legacy fallback below.
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '0';
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
};

const Certificate = ({ card, copy, language }) => {
  const [copyState, setCopyState] = useState('');
  if (!card) return null;

  const handleCopy = async (text = card.shareText || card.title) => {
    const nextText = safeText(text, language, card.title || copy.copyShare);
    const copied = await copyToClipboard(nextText);
    setCopyState(copied ? 'ok' : 'error');
    window.setTimeout(() => setCopyState(''), 1600);
  };

  return (
    <div className="share-certificate p-6">
      <p className="mb-3 text-xs tracking-[0.35em] text-cinnabar">{copy.cardEyebrow}</p>
      <h3 className="mb-2 text-2xl font-bold text-ink">{safeText(card.title, language)}</h3>
      <p className="mb-5 text-sm text-smoke">{safeText(card.subtitle, language)}</p>
      <div className="mb-5 flex flex-wrap gap-2">
        {(card.badges || []).map((badge) => (
          <span key={badge} className="border border-cinnabar/20 bg-cinnabar/5 px-3 py-1 text-xs text-cinnabar">
            {safeText(badge, language)}
          </span>
        ))}
      </div>
      <div className="flex items-end justify-between border-t border-ink/10 pt-4">
        <div>
          <p className="text-xs tracking-widest text-smoke">{copy.certificate}</p>
          <p className="text-sm font-semibold text-ink">{safeId(card.certificateId, language)}</p>
        </div>
        <div className="seal-badge h-16 w-16 rotate-3 text-center shadow-md">
          <span className="text-center text-xs font-bold leading-tight">{copy.seal}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => handleCopy()}
        className="mt-5 w-full border border-ink/20 py-2 text-sm tracking-widest text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
      >
        {copyState === 'ok' ? copy.copied : copyState === 'error' ? copy.copyFailed : copy.copyShare}
      </button>
      {card.platformIntents && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Object.entries(card.platformIntents).map(([platform, intent]) => {
            const name = platformNames[language][platform] || safeText(platform, language, '平台');
            return (
              <button
                key={platform}
                type="button"
                onClick={() => handleCopy(intent.copyText)}
                className="border border-ink/20 px-2 py-2 text-xs text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
                title={safeText(intent.canAutoPublish ? intent.publishUrl : intent.reason, language, '平台说明')}
              >
                {copy.copyPlatform(name)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DailyRevivalCard = ({ daily, copy, language, onDraw, isDrawing }) => {
  const [copyState, setCopyState] = useState('');
  if (!daily) {
    return (
      <section className="daily-revival-card daily-revival-panel p-6">
        <p className="text-paper/60">{copy.dailyLoading}</p>
        <button
          type="button"
          onClick={onDraw}
          disabled={isDrawing}
          className="museum-button mt-5 w-full px-4 py-3 text-sm tracking-widest disabled:opacity-45"
        >
          {isDrawing ? copy.drawLoading : copy.drawDaily}
        </button>
      </section>
    );
  }

  const shareCard = daily.shareCard;
  const drawDisabled = Boolean(daily.draws && daily.draws.remaining <= 0);
  const handleCopy = async (text = shareCard?.shareText || shareCard?.title) => {
    const nextText = safeText(text, language, shareCard?.title || copy.copyShare);
    const copied = await copyToClipboard(nextText);
    setCopyState(copied ? 'ok' : 'error');
    window.setTimeout(() => setCopyState(''), 1600);
  };

  return (
    <section className="daily-revival-card daily-revival-panel overflow-hidden">
      <div className="daily-revival-hero p-6 text-paper">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.35em] text-tea-gold">{copy.dailyEyebrow}</p>
            <h2 className="mt-3 break-words text-3xl font-bold leading-tight md:text-4xl">{safeText(daily.dish.name, language)}</h2>
          </div>
          <div className="daily-score w-24 shrink-0 text-center">
            <span className="block text-2xl font-bold">{daily.confidence}%</span>
            <span className="text-[10px] tracking-[0.2em] text-paper/55">{copy.confidence}</span>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2 border-y border-paper/15 py-3 text-sm text-paper/72">
          <span>{safeText(daily.dish.dynasty, language)}</span>
          <span className="text-center">{safeText(daily.rarity, language)}</span>
          <span className="text-right">{daily.draws ? `${daily.draws.remaining}/${daily.draws.limit}` : '—'}</span>
        </div>

        {daily.draws && (
          <p className="mb-4 text-sm text-paper/70">
            {copy.dailyDraws(daily.draws.usedToday, daily.draws.limit, daily.draws.remaining)}
          </p>
        )}
        <p className="leading-relaxed text-paper/78">{safeText(daily.unlockText, language)}</p>
        <CollectionBadge collection={daily.collection} copy={copy} language={language} />
        <button
          type="button"
          onClick={onDraw}
          disabled={isDrawing || drawDisabled}
          className="museum-button mt-5 w-full px-4 py-3 text-sm tracking-widest disabled:opacity-45"
        >
          {drawDisabled ? copy.noDraws : isDrawing ? copy.drawLoading : copy.drawAgain}
        </button>
      </div>

      {shareCard && (
        <div className="daily-certificate-sheet p-6">
          <div className="daily-certificate-heading mb-5">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.32em] text-cinnabar">{copy.cardEyebrow}</p>
              <h3 className="mt-2 break-words text-xl font-bold leading-tight text-ink md:text-2xl">{safeText(shareCard.title, language)}</h3>
              <p className="mt-2 text-sm text-smoke">{safeText(shareCard.subtitle, language)}</p>
            </div>
            <div className="daily-seal">
              <span>{copy.seal}</span>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {(shareCard.badges || []).map((badge) => (
              <span key={badge} className="border border-cinnabar/20 bg-cinnabar/5 px-3 py-1 text-xs text-cinnabar">
                {safeText(badge, language)}
              </span>
            ))}
          </div>

          <div className="mb-5 border-y border-ink/10 py-3">
            <p className="text-xs tracking-widest text-smoke">{copy.certificate}</p>
            <p className="mt-1 break-all text-sm font-semibold text-ink">{safeId(shareCard.certificateId, language)}</p>
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => handleCopy()}
              className="museum-button w-full px-4 py-3 text-sm tracking-widest"
            >
              {copyState === 'ok' ? copy.copied : copyState === 'error' ? copy.copyFailed : copy.copyShare}
            </button>
            {shareCard.platformIntents && (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(shareCard.platformIntents).map(([platform, intent]) => {
                  const name = platformNames[language][platform] || safeText(platform, language, '平台');
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => handleCopy(intent.copyText)}
                      className="border border-ink/20 bg-paper/60 px-2 py-2 text-xs text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
                      title={safeText(intent.canAutoPublish ? intent.publishUrl : intent.reason, language, '平台说明')}
                    >
                      {copy.copyPlatform(name)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

const CollectionBadge = ({ collection, copy, language }) => {
  if (!collection) return null;
  return (
    <div className="mt-4 border border-celadon/20 bg-celadon/10 px-4 py-3 text-sm text-celadon">
      {copy.collection}：{safeText(collection.constellation, language)}｜{safeText(collection.starId, language, '星位')}
    </div>
  );
};

const DigitalHumanPanel = ({ digitalHuman, voice, copy, language }) => {
  if (!digitalHuman) return null;

  const speechSupported = canUseSpeechNarration();
  const providerText = voice?.mode === 'external-audio' ? copy.externalAudio : copy.browserVoice;

  return (
    <div className="evidence-panel mt-5 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.35em] text-tea-gold">{copy.digitalEyebrow}</p>
          <h4 className="mt-2 text-xl font-bold text-ink">{safeText(digitalHuman.speaker?.name, language)}</h4>
          <p className="text-sm text-smoke">{safeText(digitalHuman.speaker?.role, language)}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-cinnabar/30 bg-cinnabar text-center text-xs font-bold leading-tight text-paper">
          {copy.guide}
        </div>
      </div>
      <p className="mb-3 text-lg font-semibold text-ink">{safeText(digitalHuman.headline, language)}</p>
      <p className="text-sm leading-relaxed text-ink-gray">{safeText(digitalHuman.script, language)}</p>
      <ul className="mt-4 space-y-2 text-sm text-ink-gray">
        {(digitalHuman.evidenceBullets || []).map((item) => (
          <li key={item} className="border-l-2 border-celadon/50 pl-3">{safeText(item, language)}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-xs tracking-[0.25em] text-smoke">{copy.voice}｜{providerText}</span>
        <button
          type="button"
          disabled={!speechSupported || !voice?.text}
          onClick={() => playSpeechNarration({ ...voice, text: safeText(voice?.text, language) })}
          className="border border-ink/20 px-4 py-2 text-xs text-ink transition-colors hover:border-cinnabar hover:text-cinnabar disabled:opacity-40"
        >
          {copy.playNarration}
        </button>
        <button
          type="button"
          onClick={stopSpeechNarration}
          className="border border-ink/20 px-4 py-2 text-xs text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
        >
          {copy.stopNarration}
        </button>
      </div>
      {!speechSupported && <p className="mt-2 text-xs text-smoke">{copy.speechUnavailable}</p>}
    </div>
  );
};

const LightMode = () => {
  const { language } = useLanguage();
  const copy = copySet[language];
  const location = useLocation();
  const isJudgeMode = isJudgeModeLocation(location);
  const judgeBusinessPath = '/business-value?demo=judge';
  const [description, setDescription] = useState('');
  const [imageLabel, setImageLabel] = useState('');
  const [imageData, setImageData] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [ancestor, setAncestor] = useState(null);
  const [daily, setDaily] = useState(null);
  const [recentDailyDishIds, setRecentDailyDishIds] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataMode, setDataMode] = useState('live');
  const sampleAncestorDescription = copy.sampleAncestorDescription;
  const effectiveDescription = description.trim() || (imageData ? copy.emptyDescription : copy.defaultDescription);

  const handleUseSampleAncestor = () => {
    setDescription(sampleAncestorDescription);
    setImageLabel(language === 'zh' ? '内置样例：橙香蟹粉面' : 'Built-in sample: orange crab noodles');
    setImageData('');
    setImagePreview('');
    setError('');
  };

  const fetchQuiz = async () => {
    try {
      const data = await apiRequest(`/light/authenticity?seed=${Date.now()}`);
      if (data.success) {
        setQuiz(data.data);
        setSelectedAnswer('');
        setDataMode('live');
      }
    } catch {
      setQuiz(localLightModeDemo.quiz);
      setSelectedAnswer('');
      setDataMode('local-demo');
      setError('');
    }
  };

  const drawDailyCard = async () => {
    setDailyLoading(true);
    setError('');
    const nextExcludedDishIds = [
      ...new Set([daily?.dish?.id, ...recentDailyDishIds].filter(Boolean)),
    ].slice(0, 8);
    try {
      const data = await apiRequest(`/light/daily?draw=1&seed=${Date.now()}&excludeDishId=${encodeURIComponent(nextExcludedDishIds.join(','))}`);
      if (data.success) {
        setDaily(data.data);
        setDataMode('live');
        setRecentDailyDishIds((previousIds) => [
          ...new Set([data.data.dish?.id, ...nextExcludedDishIds, ...previousIds].filter(Boolean)),
        ].slice(0, 8));
      }
      else setError(data.message || copy.loadPageError);
    } catch {
      setDaily(localLightModeDemo.daily);
      setRecentDailyDishIds([localLightModeDemo.daily.dish.id]);
      setDataMode('local-demo');
      setError('');
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      apiRequest('/light/daily'),
      apiRequest(`/light/authenticity?seed=${Date.now()}`),
    ]).then(([dailyResult, quizResult]) => {
      if (cancelled) return;
      let usedLocalDemo = false;
      if (dailyResult.status === 'fulfilled' && dailyResult.value.success) {
        setDaily(dailyResult.value.data);
        setRecentDailyDishIds([dailyResult.value.data.dish?.id].filter(Boolean));
      } else {
        setDaily(localLightModeDemo.daily);
        setRecentDailyDishIds([localLightModeDemo.daily.dish.id]);
        usedLocalDemo = true;
      }
      if (quizResult.status === 'fulfilled' && quizResult.value.success) {
        setQuiz(quizResult.value.data);
      } else {
        setQuiz(localLightModeDemo.quiz);
        usedLocalDemo = true;
      }
      setDataMode(usedLocalDemo ? 'local-demo' : 'live');
      if (usedLocalDemo) setError('');
    });
    return () => {
      cancelled = true;
    };
  }, [copy.loadPageError]);

  const handleAncestor = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/light/ancestor', {
        method: 'POST',
        body: JSON.stringify({ description: effectiveDescription, imageLabel, imageData }),
      });
      if (data.success) {
        setAncestor(data.data);
        setDataMode('live');
      }
      else setError(data.message || copy.ancestorError);
    } catch {
      setAncestor(localLightModeDemo.ancestor);
      setDataMode('local-demo');
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageLabel(file.name);
    if (!description.trim()) {
      setDescription(language === 'zh' ? copy.emptyDescription : `I photographed ${file.name.replace(/\.[^.]+$/, '')}; identify its culinary ancestor.`);
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setImageData(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const answerState = selectedAnswer ? (selectedAnswer === quiz?.answerId ? 'correct' : 'wrong') : '';
  const sanitizedError = useMemo(() => safeText(error, language, copy.backendError), [copy.backendError, error, language]);

  return (
    <div className="public-lab overflow-x-hidden px-5 py-14 md:px-6 md:py-16">
      <div className="mx-auto w-full max-w-[1120px]">
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-end">
          <div>
            <span className="text-sm tracking-[0.22em] text-cinnabar md:tracking-[0.3em]">{copy.heroEyebrow}</span>
            <h1 className="mt-4 max-w-4xl break-words text-4xl font-bold leading-tight text-ink md:text-5xl">
              {copy.heroTitle}
            </h1>
            <p className="mt-5 max-w-3xl break-words text-lg leading-relaxed text-ink-gray">{copy.heroSubtitle}</p>
          </div>
          <div className="archive-surface p-5">
            <p className="text-xs tracking-[0.32em] text-tea-gold">{copy.visionEyebrow}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-gray">{copy.uploadHelp}</p>
            {dataMode === 'local-demo' && (
              <div className="local-demo-status mt-4 inline-flex border border-tea-gold/35 bg-tea-gold/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-tea-gold">
                本地演示数据
              </div>
            )}
            {isJudgeMode && (
              <Link
                to={judgeBusinessPath}
                state={{ judge: true }}
                className="judge-next-cta museum-button mt-5 w-full px-5 py-3 text-sm tracking-[0.2em]"
              >
                下一步：商业价值
              </Link>
            )}
          </div>
        </section>

        {error && <div className="mb-8 break-words border-l-4 border-rouge bg-rouge/10 px-5 py-3 text-rouge">{sanitizedError}</div>}

        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(380px,420px)]">
          <section className="camera-stage min-w-0 p-6 text-paper md:p-8">
            <p className="mb-3 break-words text-xs tracking-[0.24em] text-tea-gold md:tracking-[0.35em]">{copy.ancestorEyebrow}</p>
            <h2 className="mb-6 break-words text-3xl font-bold leading-tight md:text-4xl">{copy.ancestorTitle}</h2>
            <form onSubmit={handleAncestor} className="space-y-5">
              <label className="block min-w-0 cursor-pointer border border-dashed border-paper/35 bg-paper/8 p-5 transition-colors hover:border-tea-gold">
                <span className="mb-2 block break-words text-xs tracking-[0.24em] text-tea-gold md:tracking-[0.3em]">{copy.uploadEyebrow}</span>
                <span className="block break-words text-xl font-semibold text-paper">{imageLabel || copy.chooseImage}</span>
                <span className="mt-2 block break-words text-sm text-paper/62">{copy.uploadHelp}</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
              </label>
              {imagePreview && (
                <img src={imagePreview} alt={copy.previewAlt} className="h-72 w-full border border-paper/20 object-cover" />
              )}
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="h-32 w-full resize-none border-l-4 border-tea-gold/70 bg-paper px-4 py-3 leading-relaxed text-ink outline-none focus:border-cinnabar"
                placeholder={copy.placeholder}
              />
              <button
                type="button"
                onClick={handleUseSampleAncestor}
                className="border border-paper/30 px-4 py-2 text-sm tracking-widest text-paper/80 transition-colors hover:border-tea-gold hover:text-tea-gold"
              >
                内置样例
              </button>
              <button
                type="submit"
                disabled={loading || (!description.trim() && !imageData)}
                className="museum-button px-8 py-3 tracking-widest disabled:opacity-40"
              >
                {loading ? copy.loading : copy.identify}
              </button>
            </form>
          </section>

          <aside className="min-w-0 space-y-8">
            <DailyRevivalCard daily={daily} copy={copy} language={language} onDraw={drawDailyCard} isDrawing={dailyLoading} />
          </aside>
        </div>

        {ancestor && (
          <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="archive-surface p-6 md:p-8">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                <h3 className="text-3xl font-bold text-ink">{safeText(ancestor.ancestor.name, language)}</h3>
                <span className="text-sm tracking-widest text-cinnabar">{safeText(ancestor.rarity, language)}</span>
              </div>
              <p className="mb-5 text-sm tracking-widest text-tea-gold">
                {safeText(ancestor.ancestor.dynasty, language)}｜{ancestor.confidence}%
              </p>
              <p className="mb-5 leading-relaxed text-ink-gray">{safeText(ancestor.story, language)}</p>
              <p className="border-l-2 border-cinnabar/40 pl-3 italic text-cinnabar">{safeText(ancestor.taotieComment, language)}</p>
              <CollectionBadge collection={ancestor.collection} copy={copy} language={language} />
              {ancestor.vision && (
                <div className="evidence-panel mt-6 p-5">
                  <p className="mb-2 text-xs tracking-[0.35em] text-celadon">{copy.visionEyebrow}</p>
                  <p className="text-sm text-ink-gray">
                    {copy.provider}：{ancestor.vision.provider === 'external' ? copy.externalProvider : copy.fallbackProvider}｜{copy.confidence}：{Math.round((ancestor.vision.confidence || 0) * 100)}%
                  </p>
                  <p className="mt-1 text-xs text-smoke">
                    {copy.providerStatus}：{ancestor.vision.provider === 'external' ? copy.externalProvider : copy.fallbackProvider}
                    {ancestor.vision.provider !== 'external' ? `｜${copy.fallbackHint}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(ancestor.vision.labels || []).map((label) => (
                      <span key={label} className="border border-ink/10 bg-paper px-2 py-1 text-xs text-ink">
                        {safeText(label, language)}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-ink-gray">
                    {(ancestor.vision.evidence || []).map((item) => (
                      <li key={item}>{safeText(item, language)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <DigitalHumanPanel digitalHuman={ancestor.digitalHuman} voice={ancestor.voice} copy={copy} language={language} />
            </div>
            <Certificate card={ancestor.shareCard} copy={copy} language={language} />
          </section>
        )}

        <section className="evidence-panel mt-10 min-w-0 p-6 md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 text-xs tracking-[0.35em] text-tea-gold">{copy.quizEyebrow}</p>
              <h2 className="break-words text-2xl font-bold leading-tight text-ink md:text-3xl">{copy.quizTitle}</h2>
            </div>
            <button
              type="button"
              onClick={fetchQuiz}
              className="border border-ink/30 px-5 py-2 tracking-widest text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
            >
              {copy.nextRound}
            </button>
          </div>

          {quiz && (
            <>
              <p className="mb-5 text-ink-gray">{safeText(quiz.question, language)}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {quiz.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const showCorrect = selectedAnswer && option.isReal;
                  const showWrong = isSelected && !option.isReal;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedAnswer(option.id)}
                      className={`border p-5 text-left transition-all ${
                        showCorrect
                          ? 'border-celadon bg-celadon/10'
                          : showWrong
                            ? 'border-rouge bg-rouge/10'
                            : isSelected
                              ? 'border-cinnabar bg-cinnabar/5'
                              : 'border-ink/10 bg-paper hover:border-cinnabar/40'
                      }`}
                    >
                      <p className="mb-1 text-xl font-bold text-ink">{safeText(option.name, language)}</p>
                      <p className="mb-3 text-sm text-tea-gold">{safeText(option.dynasty, language)}｜{safeText(option.source, language)}</p>
                      <p className="text-sm leading-relaxed text-ink-gray">{safeText(option.description, language)}</p>
                    </button>
                  );
                })}
              </div>

              {selectedAnswer && (
                <div className="mt-6 grid items-start gap-6 md:grid-cols-[1fr_320px]">
                  <div className={`border-l-4 p-5 ${answerState === 'correct' ? 'border-celadon bg-celadon/10' : 'border-rouge bg-rouge/10'}`}>
                    <p className="mb-2 font-bold text-ink">{answerState === 'correct' ? copy.correct : copy.wrong}</p>
                    <p className="leading-relaxed text-ink-gray">{safeText(quiz.explanation, language)}</p>
                  </div>
                  <Certificate card={quiz.shareCard} copy={copy} language={language} />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default LightMode;
