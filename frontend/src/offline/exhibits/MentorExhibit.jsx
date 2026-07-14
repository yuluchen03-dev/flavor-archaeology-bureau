// 数字传承人展厅：围绕标杆菜蟹酿橙的本地多轮问答。
// 支持预定义意图与关键词匹配的自由问题；每个答案标注"离线问答"与来源。
// 语音默认静音，仅在用户主动点击后调用浏览器 speechSynthesis；字幕始终可见；提供停止语音。
// 音频不可用时文字能力保持完整。

import { useEffect, useRef, useState } from 'react';
import { mentorAnswers, museumDishes } from '../data/offlineMuseumData.js';
import ExhibitShell from '../components/ExhibitShell.jsx';

// 预定义意图：围绕历史背景、食材、技法与现代做法四类。
const INTENT_KEYS = ['蟹酿橙', '复原方法', '进化推演', '祖先匹配'];

// 关键词到意图的映射，用于自由问题匹配。
const INTENT_KEYWORDS = [
  { key: '蟹酿橙', keywords: ['蟹', '橙', '酿', '复原依据', '山家清供', '甑', '蟹膏'] },
  { key: '复原方法', keywords: ['复原', '线索', '证据不足', '弱线索', '能不能', '如何复原'] },
  { key: '进化推演', keywords: ['进化', '融合', 'AI', '生成', '推演', '父本'] },
  { key: '祖先匹配', keywords: ['祖先', '图片', '匹配', '认祖', '拍照', '推测'] },
];

const crabDish = museumDishes.find((dish) => dish.id === 'dish_001');

function buildSelectedDishAnswer(dish) {
  return {
    question: `${dish.name}有哪些可核验信息？`,
    answer: `${dish.name}的馆藏记录标注为${dish.archiveState}。现有字段支持朝代${dish.dynasty}、地域${dish.region}与技法${dish.technique || '待补'}；未记录内容不作确定推断。`,
    source: dish.source ? `${dish.source} · 离线馆藏` : '离线馆藏 · 资料待补',
  };
}

function matchIntent(question) {
  const text = (question || '').trim();
  if (!text) return null;
  let bestKey = null;
  let bestScore = 0;
  for (const entry of INTENT_KEYWORDS) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = entry.key;
    }
  }
  return bestKey;
}

function buildModernAnswer() {
  return {
    question: '蟹酿橙在现代厨房怎么做？',
    answer: '现代厨房转译：以甜橙截顶去瓤作器，填入蟹粉与蟹肉，覆顶后蒸锅中火蒸 8–10 分钟，佐花雕酒与镇江香醋。火候与酒醋配比为现代推测，需厨师试做校准。',
    source: '现代转译 · 离线规则',
  };
}

function buildIngredientAnswer() {
  return {
    question: '蟹酿橙的核心食材有哪些？',
    answer: '核心食材包括黄熟大橙（作器）、蟹膏与蟹肉（填馅）、酒、醋、水（蒸制调味）。橙壳既是容器也是风味来源，蟹膏蟹肉提供主料鲜味。',
    source: '《山家清供》卷下 · 离线问答',
  };
}

function buildTechniqueAnswer() {
  return {
    question: '蟹酿橙的技法脉络是什么？',
    answer: '技法脉络为"酿"（以蟹膏肉实其内）+"蒸"（入小甑蒸熟）+"覆"（带枝顶覆封口）。三步构成稳定的复原结构，火候为跨资料推断需专家复核。',
    source: '《山家清供》卷下 · 离线问答',
  };
}

function buildHistoryAnswer() {
  return {
    question: '蟹酿橙的历史背景是什么？',
    answer: `蟹酿橙出自南宋林洪《山家清供》卷下，属宋代江浙文人清供菜系。当前档案状态为${crabDish ? crabDish.archiveState : '证据完整'}，是离线博物馆唯一证据完整的标杆菜。`,
    source: '《山家清供》卷下 · 离线问答',
  };
}

const EXTENDED_ANSWERS = {
  历史: buildHistoryAnswer(),
  食材: buildIngredientAnswer(),
  技法: buildTechniqueAnswer(),
  现代: buildModernAnswer(),
};

const EXTENDED_KEYWORDS = [
  { key: '历史', keywords: ['历史', '背景', '朝代', '宋代', '南宋', '由来'] },
  { key: '食材', keywords: ['食材', '原料', '蟹膏', '橙', '配料'] },
  { key: '技法', keywords: ['技法', '蒸', '酿', '甑', '做法', '步骤'] },
  { key: '现代', keywords: ['现代', '厨房', '家里', '复刻', '家常'] },
];

function matchExtended(question) {
  const text = (question || '').trim();
  if (!text) return null;
  let bestKey = null;
  let bestScore = 0;
  for (const entry of EXTENDED_KEYWORDS) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (text.includes(keyword)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = entry.key;
    }
  }
  return bestKey ? EXTENDED_ANSWERS[bestKey] : null;
}

function resolveAnswer(question) {
  const intentKey = matchIntent(question);
  if (intentKey && mentorAnswers[intentKey]) {
    return mentorAnswers[intentKey];
  }
  const extended = matchExtended(question);
  if (extended) return extended;
  return {
    question,
    answer: '该问题超出离线问答覆盖范围。可尝试询问蟹酿橙的历史背景、食材、技法、现代做法、复原依据或进化推演。',
    source: '离线问答 · 兜底提示',
  };
}

function getSpeechSynthesis() {
  if (typeof window === 'undefined') return null;
  try {
    return window.speechSynthesis || null;
  } catch {
    return null;
  }
}

export default function MentorExhibit({
  onNavigate = () => {},
  embedded = false,
  selectedDishId = 'dish_001',
}) {
  const selectedDish = museumDishes.find((dish) => dish.id === selectedDishId) || crabDish;
  const selectedDishAnswer = buildSelectedDishAnswer(selectedDish);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [spokenUtterance, setSpokenUtterance] = useState(null);
  // 惰性初始化：在浏览器环境中同步检测 speechSynthesis 可用性，避免在 effect 中调用 setState。
  const [audioAvailable] = useState(() => Boolean(getSpeechSynthesis()));
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const turnCounter = useRef(0);

  useEffect(() => {
    const synth = getSpeechSynthesis();
    return () => {
      if (synth) {
        try {
          synth.cancel();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const stopSpeech = () => {
    const synth = getSpeechSynthesis();
    if (synth) {
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
    }
    setSpokenUtterance(null);
  };

  const speakAnswer = (answer) => {
    const synth = getSpeechSynthesis();
    if (!synth || !speechEnabled) return;
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(answer);
      utterance.lang = 'zh-CN';
      utterance.onend = () => setSpokenUtterance(null);
      utterance.onerror = () => setSpokenUtterance(null);
      synth.speak(utterance);
      setSpokenUtterance(answer);
    } catch {
      setSpokenUtterance(null);
    }
  };

  const askQuestion = (question) => {
    const trimmed = (question || '').trim();
    if (!trimmed) return;
    const answer = trimmed === selectedDishAnswer.question
      ? selectedDishAnswer
      : resolveAnswer(trimmed);
    turnCounter.current += 1;
    const entry = {
      id: `mentor-turn-${turnCounter.current}`,
      question: trimmed,
      answer: answer.answer,
      source: answer.source,
      label: '离线问答',
    };
    setHistory((prev) => [...prev, entry]);
    setInput('');
    if (speechEnabled) speakAnswer(answer.answer);
  };

  const handleToggleSpeech = () => {
    if (speechEnabled) {
      stopSpeech();
      setSpeechEnabled(false);
    } else {
      setSpeechEnabled(true);
    }
  };

  const content = (
      <div className="mentor-exhibit">
        <p className="mentor-intro">
          当前研究对象：<strong>{selectedDish.name}</strong>。数字传承人提供本地多轮问答，所有答案均为离线问答，不调用网络 API。
        </p>

        <div className="mentor-speech-controls">
          <label className="mentor-speech-toggle">
            <input
              type="checkbox"
              checked={speechEnabled}
              onChange={handleToggleSpeech}
              disabled={!audioAvailable}
            />
            <span>
              语音朗读{audioAvailable ? '' : '（当前浏览器不可用，文字问答照常使用）'}
            </span>
          </label>
          {speechEnabled && spokenUtterance && (
            <button type="button" className="mentor-speech-stop" onClick={stopSpeech}>
              停止语音
            </button>
          )}
        </div>

        <div className="mentor-quick">
          <p className="mentor-quick-title">推荐问题：</p>
          <div className="mentor-quick-list">
            <button
              type="button"
              className="mentor-quick-item"
              onClick={() => askQuestion(selectedDishAnswer.question)}
            >
              {selectedDishAnswer.question}
            </button>
            {INTENT_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className="mentor-quick-item"
                onClick={() => askQuestion(mentorAnswers[key].question)}
              >
                {mentorAnswers[key].question}
              </button>
            ))}
            {Object.values(EXTENDED_ANSWERS).map((entry) => (
              <button
                key={entry.question}
                type="button"
                className="mentor-quick-item"
                onClick={() => askQuestion(entry.question)}
              >
                {entry.question}
              </button>
            ))}
          </div>
        </div>

        <form
          className="mentor-form"
          onSubmit={(event) => {
            event.preventDefault();
            askQuestion(input);
          }}
        >
          <label htmlFor="mentor-input" className="mentor-form-label">自由提问</label>
          <input
            id="mentor-input"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="如：蟹酿橙的复原依据是什么？"
            className="mentor-input"
          />
          <button type="submit" className="mentor-submit">提问</button>
        </form>

        <div className="mentor-history" aria-label="问答记录">
          {history.length === 0 && (
            <p className="mentor-empty">还没有问答记录，从推荐问题或自由提问开始。</p>
          )}
          {history.map((entry) => (
            <article key={entry.id} className="mentor-turn">
              <p className="mentor-turn-question">问：{entry.question}</p>
              <p className="mentor-turn-answer">答：{entry.answer}</p>
              <p className="mentor-turn-meta">
                <span className="mentor-turn-label">{entry.label}</span>
                <span className="mentor-turn-source">来源：{entry.source}</span>
                {speechEnabled && (
                  <button
                    type="button"
                    className="mentor-turn-speak"
                    onClick={() => speakAnswer(entry.answer)}
                  >
                    朗读
                  </button>
                )}
              </p>
            </article>
          ))}
        </div>

        <p className="mentor-note">
          默认静音。语音仅在用户主动开启后调用浏览器 speechSynthesis，字幕始终可见；音频不可用时文字问答保持完整。
        </p>
      </div>
  );

  if (embedded) return content;
  return (
    <ExhibitShell title="数字传承人 · 离线考据问答" onBack={() => onNavigate('home')}>
      {content}
    </ExhibitShell>
  );
}
