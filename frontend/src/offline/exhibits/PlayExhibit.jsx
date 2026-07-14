// 轻量玩法展厅：四个内部标签页——拍照认祖、每日复活、真假非遗、分享证书。
// 拍照认祖只读取文件名与内存预览，不上传图片字节；调用 matchAncestor 标注"离线推测"。
// 每日复活以本地日期生成稳定结果，调用 getDailyRevival。
// 真假非遗使用内置题库，每题回答后立即展示正确答案、文献依据与证据状态。
// 分享证书调用 createCertificateSvg，提供下载与打印降级方案。

import { useMemo, useState } from 'react';
import { museumDishes, quizData } from '../data/offlineMuseumData.js';
import { matchAncestor } from '../lib/ancestorMatcher.js';
import { getDailyRevival } from '../lib/dailyRevival.js';
import { createCertificateSvg } from '../lib/certificate.js';
import ExhibitShell from '../components/ExhibitShell.jsx';

const TABS = [
  { key: 'ancestor', label: '拍照认祖' },
  { key: 'revival', label: '每日复活' },
  { key: 'quiz', label: '真假非遗' },
  { key: 'certificate', label: '分享证书' },
];

// === 拍照认祖 ===

function AncestorTab({ selectedDish }) {
  const [fileName, setFileName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [description, setDescription] = useState(() => (
    selectedDish ? `${selectedDish.name} ${selectedDish.region} ${selectedDish.technique}` : ''
  ));
  const [result, setResult] = useState(null);

  const handleFile = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    // 仅读取文件名与内存预览，不持久化图片字节。
    setFileName(file.name);
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        /* ignore */
      }
    }
    try {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch {
      setPreviewUrl('');
    }
  };

  const handleMatch = () => {
    setResult(matchAncestor({ description, imageName: fileName }));
  };

  const handleReset = () => {
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        /* ignore */
      }
    }
    setFileName('');
    setPreviewUrl('');
    setDescription('');
    setResult(null);
  };

  return (
    <div className="play-ancestor">
      <p className="play-tab-intro">
        拍照认祖只在本机处理：选择本地菜品图片后，结合文件名与补充描述匹配内置风味谱系。
        仅读取文件名与内存预览，不上传图片字节；结果标注为"离线推测"。
      </p>
      <label className="play-ancestor-file">
        <span className="play-field-label">选择本地图片</span>
        <input type="file" accept="image/*" onChange={handleFile} />
      </label>
      {previewUrl && (
        <img className="play-ancestor-preview" src={previewUrl} alt={fileName || '本地预览'} />
      )}
      <label className="play-ancestor-desc">
        <span className="play-field-label">补充描述（菜名/食材/技法）</span>
        <input
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="如：橙香蟹粉、东坡肉、烤鸭…"
        />
      </label>
      <div className="play-actions">
        <button type="button" className="play-action" onClick={handleMatch} disabled={!fileName && !description}>
          匹配祖先
        </button>
        <button type="button" className="play-action play-action-secondary" onClick={handleReset}>
          重置
        </button>
      </div>

      {result && (
        <article className="play-ancestor-result" aria-label="祖先匹配结果">
          <p className="play-result-status">
            状态：{result.status}（可信度：{result.confidence}）
          </p>
          <p className="play-result-name">匹配祖先：{result.ancestorName}</p>
          <p className="play-result-reason">{result.reason}</p>
          {result.matchedKeywords.length > 0 && (
            <p className="play-result-keywords">命中关键词：{result.matchedKeywords.join('、')}</p>
          )}
          {result.ancestor && (
            <dl className="play-ancestor-meta">
              <dt>朝代</dt>
              <dd>{result.ancestor.dynasty}</dd>
              <dt>地域</dt>
              <dd>{result.ancestor.region}</dd>
              <dt>技法</dt>
              <dd>{result.ancestor.technique}</dd>
              <dt>风味</dt>
              <dd>{result.ancestor.flavor || '暂无记录'}</dd>
            </dl>
          )}
          {result.suggestion && (
            <p className="play-result-suggestion">{result.suggestion}</p>
          )}
        </article>
      )}
    </div>
  );
}

// === 每日复活 ===

function RevivalTab() {
  const today = useMemo(() => new Date(), []);
  const revival = useMemo(() => getDailyRevival(today), [today]);
  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  // 简单线索解谜：用户输入菜名或朝代即可解锁档案。
  const expectedTokens = [revival.name, revival.dynasty];

  const handleSubmit = () => {
    setSubmitted(true);
    const text = userAnswer.trim();
    if (expectedTokens.some((token) => token && text.includes(token))) {
      setUnlocked(true);
    }
  };

  return (
    <div className="play-revival">
      <p className="play-tab-intro">
        每日复活从本地种子库抽取一道历史菜，离线"每日"以本地日期生成稳定结果。
        完成线索解谜（输入菜名或朝代）即可解锁档案。
      </p>
      <p className="play-revival-date">今日日期：{revival.date}</p>
      <div className="play-revival-clues">
        <p className="play-revival-clue-title">线索</p>
        <ul>
          <li>朝代：{revival.dynasty}</li>
          <li>地域：{revival.region}</li>
          <li>技法：{revival.technique}</li>
          <li>原文短摘：{revival.passage || '暂无原文摘录'}</li>
        </ul>
      </div>
      <label className="play-revival-input">
        <span className="play-field-label">输入菜名或朝代解锁</span>
        <input
          type="text"
          value={userAnswer}
          onChange={(event) => setUserAnswer(event.target.value)}
          placeholder="如：蟹酿橙 / 宋"
        />
      </label>
      <button type="button" className="play-action" onClick={handleSubmit} disabled={!userAnswer.trim()}>
        提交解谜
      </button>

      {submitted && !unlocked && (
        <p className="play-revival-warn">答案不匹配，请再试一次。可从线索中的朝代或菜名入手。</p>
      )}

      {unlocked && (
        <article className="play-revival-unlocked" aria-label="每日复活档案">
          <h4 className="play-revival-title">{revival.name}</h4>
          <img className="play-revival-image" src={revival.image} alt={revival.name} loading="lazy" />
          <dl className="play-revival-meta">
            <dt>朝代</dt>
            <dd>{revival.dynasty}</dd>
            <dt>地域</dt>
            <dd>{revival.region}</dd>
            <dt>档案状态</dt>
            <dd>{revival.archiveState}</dd>
            <dt>风味</dt>
            <dd>{revival.flavor || '暂无记录'}</dd>
            <dt>出处</dt>
            <dd>{revival.source || '暂无出处'}</dd>
          </dl>
          <p className="play-revival-mode">{revival.mode}</p>
        </article>
      )}
    </div>
  );
}

// === 真假非遗 ===

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function QuizTab() {
  // 取等量真实与伪传统题，确保题型均衡。
  const questions = useMemo(() => {
    const real = quizData.real.slice(0, 5).map((item) => ({
      ...item,
      evidence: `真实非遗菜品，出自 ${item.dynasty}，难度：${item.difficulty || '未知'}`,
      source: item.dynasty ? `非遗菜品 · ${item.dynasty}` : '非遗菜品',
    }));
    const fake = quizData.fake.slice(0, 5).map((item) => ({
      ...item,
      evidence: item.tell || '伪传统反例，非真实非遗。',
      source: item.source || '伪传统反例',
    }));
    return shuffle([...real, ...fake]);
  }, []);

  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(null);

  const current = questions[index];

  const handleAnswer = (isRealGuess) => {
    setAnswered({ guess: isRealGuess, correct: isRealGuess === current.isReal });
  };

  const handleNext = () => {
    setAnswered(null);
    setIndex((prev) => (prev + 1) % questions.length);
  };

  if (!current) return null;

  return (
    <div className="play-quiz">
      <p className="play-tab-intro">
        真假非遗使用内置题库，每题回答后立即展示正确答案、文献依据与证据状态。
      </p>
      <p className="play-quiz-progress">第 {index + 1} / {questions.length} 题</p>
      <div className="play-quiz-card">
        <h4 className="play-quiz-name">{current.name}</h4>
        <p className="play-quiz-dynasty">朝代：{current.dynasty || '待考'}</p>
        {current.description && <p className="play-quiz-desc">{current.description}</p>}
        <div className="play-quiz-actions">
          <button
            type="button"
            className="play-action"
            onClick={() => handleAnswer(true)}
            disabled={answered !== null}
          >
            真非遗
          </button>
          <button
            type="button"
            className="play-action play-action-secondary"
            onClick={() => handleAnswer(false)}
            disabled={answered !== null}
          >
            假非遗
          </button>
        </div>
      </div>

      {answered && (
        <article className="play-quiz-result" aria-label="答题结果">
          <p className={answered.correct ? 'play-quiz-correct' : 'play-quiz-wrong'}>
            {answered.correct ? '回答正确' : '回答错误'}：这是一道{current.isReal ? '真' : '假'}非遗题。
          </p>
          <p className="play-quiz-evidence">文献依据：{current.evidence}</p>
          <p className="play-quiz-evidence-state">证据状态：{current.isReal ? '真实非遗，有明确出处' : '伪传统反例，需警惕虚构传承'}</p>
          <p className="play-quiz-source">来源：{current.source}</p>
          <button type="button" className="play-action" onClick={handleNext}>
            下一题
          </button>
        </article>
      )}
    </div>
  );
}

// === 分享证书 ===

function CertificateTab({ selectedDish }) {
  const [dishName, setDishName] = useState(selectedDish?.name || '蟹酿橙');
  const [holder, setHolder] = useState('风味考古复原官');
  const today = useMemo(() => new Date(), []);
  const dateStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  const svg = useMemo(
    () => createCertificateSvg({ title: holder, dishName, date: dateStr }),
    [holder, dishName, dateStr],
  );

  // 通过 data URL 内联渲染 SVG，避免使用 dangerouslySetInnerHTML。
  const svgDataUrl = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    [svg],
  );

  const handleDownload = () => {
    // 浏览器限制直接下载时降级为打印/截图。
    try {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fengwei-certificate-${dateStr}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // 降级到打印
      handlePrint();
    }
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>风味考古复原证书</title></head><body>${svg}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="play-certificate">
      <p className="play-tab-intro">
        分享证书根据用户完成的复原任务在本地生成 SVG 证书，支持下载或打印。证书不上传用户数据。
        若浏览器限制直接下载，请使用打印或截图降级方案。
      </p>
      <div className="play-certificate-form">
        <label className="play-field">
          <span className="play-field-label">复原菜品</span>
          <input type="text" value={dishName} onChange={(event) => setDishName(event.target.value)} />
        </label>
        <label className="play-field">
          <span className="play-field-label">持证人头衔</span>
          <input type="text" value={holder} onChange={(event) => setHolder(event.target.value)} />
        </label>
      </div>
      <img
        className="play-certificate-preview"
        src={svgDataUrl}
        alt="风味考古复原证书预览"
      />
      <div className="play-actions">
        <button type="button" className="play-action" onClick={handleDownload}>
          下载 SVG
        </button>
        <button type="button" className="play-action play-action-secondary" onClick={handlePrint}>
          打印 / 截图降级
        </button>
      </div>
    </div>
  );
}

export default function PlayExhibit({
  onNavigate = () => {},
  embedded = false,
  selectedDishId = 'dish_001',
}) {
  const [activeTab, setActiveTab] = useState('ancestor');
  const selectedDish = museumDishes.find((dish) => dish.id === selectedDishId) || museumDishes[0];

  const content = (
      <div className="play-exhibit">
        <p className="play-selected-dish">
          当前馆藏：<strong>{selectedDish.name}</strong> · 互动任务和证书默认继承此菜品
        </p>
        <nav className="play-tabs" aria-label="玩法标签页">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`play-tab${activeTab === tab.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="play-tab-content">
          {activeTab === 'ancestor' && <AncestorTab selectedDish={selectedDish} />}
          {activeTab === 'revival' && <RevivalTab />}
          {activeTab === 'quiz' && <QuizTab />}
          {activeTab === 'certificate' && <CertificateTab selectedDish={selectedDish} />}
        </div>
      </div>
  );

  if (embedded) return content;
  return (
    <ExhibitShell title="轻量玩法 · 拍照认祖 / 每日复活 / 真假非遗 / 分享证书" onBack={() => onNavigate('home')}>
      {content}
    </ExhibitShell>
  );
}
