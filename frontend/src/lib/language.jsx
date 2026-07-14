import { createContext, useContext, useEffect, useMemo, useState } from 'react';
/* eslint-disable react-refresh/only-export-components */

const STORAGE_KEY = 'flavor-language';
const LanguageContext = createContext(null);

const replacements = [
  [/FLAVOR ARCHAEOLOGY BUREAU/gi, '风味考古局'],
  [/FLAVOR ARCHAEOLOGY/gi, '风味考古'],
  [/LIGHT MODE/gi, '轻量玩法'],
  [/Public experience/gi, '公众体验'],
  [/PHOTO ANCESTOR/gi, '拍照认祖'],
  [/Image-first recognition/gi, '图像优先识别'],
  [/SHARE CARD/gi, '分享卡'],
  [/Flavor Certificate/gi, '风味证书'],
  [/CERTIFICATE/gi, '证书'],
  [/Flavor Seal/gi, '风味印'],
  [/Flavor Guide/gi, '风味向导'],
  [/DIGITAL HUMAN/gi, '数字传承人'],
  [/Flavor narrator/gi, '风味讲述'],
  [/VOICE/gi, '语音'],
  [/Provider Status/gi, '服务状态'],
  [/Provider/gi, '来源'],
  [/Confidence/gi, '可信度'],
  [/VISION/gi, '视觉'],
  [/Image evidence/gi, '图像证据'],
  [/external audio/gi, '外部音频'],
  [/external VLM/gi, '外部视觉模型'],
  [/browser TTS/gi, '浏览器朗读'],
  [/fallback evidence/gi, '本地证据'],
  [/Local fallback is active; configure a VLM key to prioritize real visual model analysis\./gi, '当前使用本地证据；配置视觉模型密钥后可优先进行真实图像分析。'],
  [/DAILY REVIVAL/gi, '每日复活'],
  [/Today/gi, '今日'],
  [/Daily draws/gi, '今日抽卡'],
  [/Remaining/gi, '剩余'],
  [/TRUE OR FAKE/gi, '真假非遗'],
  [/Authenticity quiz/gi, '考据问答'],
  [/Correct/gi, '答对了'],
  [/Caught by a fantasy dish/gi, '识破虚构菜'],
  [/Copy share text/gi, '复制分享文案'],
  [/Copy Xiaohongshu/gi, '复制小红书文案'],
  [/Copy Douyin/gi, '复制抖音文案'],
  [/Xiaohongshu/gi, '小红书'],
  [/Douyin/gi, '抖音'],
  [/Collection/gi, '收藏'],
  [/AI/gi, '智能'],
  [/API/gi, '接口'],
  [/INPUT/gi, '输入'],
  [/PROCESS/gi, '流程'],
  [/SIGNATURE/gi, '样本'],
  [/FEATURES/gi, '特色'],
  [/REASONING/gi, '考据链'],
  [/RESULT/gi, '结果'],
  [/ORIGINAL/gi, '古籍原文'],
  [/INGREDIENTS/gi, '食材'],
  [/STEPS/gi, '步骤'],
  [/CONTEXT/gi, '文化语境'],
  [/STAR MAP/gi, '味觉星图'],
  [/COLLECTED/gi, '已收藏'],
  [/DISH DETAIL/gi, '菜品详情'],
  [/DESCRIPTION/gi, '描述'],
  [/FLAVOR/gi, '风味'],
  [/SOURCE/gi, '出处'],
  [/DYNASTY LEGEND/gi, '朝代图例'],
  [/FLAVOR EVOLUTION/gi, '风味进化'],
  [/PARENT FLAVOR/gi, '亲本风味'],
  [/NEW SPECIES/gi, '新物种'],
  [/FLAVOR COMPARISON/gi, '风味对比'],
  [/EVOLUTION CERTIFICATE/gi, '进化证书'],
  [/TEACHING/gi, '数字传承'],
  [/FLAVOR MASTER/gi, '风味导师'],
  [/DIALOGUE/gi, '对话'],
];

export function replaceLatinText(value, fallback = '') {
  if (typeof value !== 'string') return value;
  const stripped = value
    .replace(/[A-Za-z][A-Za-z0-9_./:-]*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return stripped || fallback;
}

export function sanitizeChineseText(value, fallback = '本地记录') {
  if (typeof value !== 'string') return value;
  let next = value;
  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }
  if (/[A-Za-z]/.test(next)) {
    next = replaceLatinText(next, fallback);
  }
  return next;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'zh';
    return window.localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const value = useMemo(() => ({
    language,
    isChinese: language === 'zh',
    setLanguage,
    toggleLanguage: () => setLanguage((current) => (current === 'zh' ? 'en' : 'zh')),
    t: (zh, en) => (language === 'zh' ? zh : en),
    sanitize: (text, fallback) => (language === 'zh' ? sanitizeChineseText(text, fallback) : text),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  const isChinese = language === 'zh';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex h-9 shrink-0 items-center border border-ink/15 bg-paper px-3 text-xs font-semibold tracking-wider text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
      aria-label={isChinese ? '切换到英文' : 'Switch to Chinese'}
    >
      {isChinese ? '中文｜英文' : 'EN | 中文'}
    </button>
  );
}

export function ChineseTextGuard() {
  const { language } = useLanguage();

  useEffect(() => {
    if (language !== 'zh') return undefined;

    const sanitizeNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const next = sanitizeChineseText(node.nodeValue, '');
        if (next !== node.nodeValue) node.nodeValue = next;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'].includes(node.tagName)) return;
      node.childNodes.forEach(sanitizeNode);
    };

    const sanitizePage = () => sanitizeNode(document.body);
    sanitizePage();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(sanitizeNode);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
