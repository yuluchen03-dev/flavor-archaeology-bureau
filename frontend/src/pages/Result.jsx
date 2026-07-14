import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sanitizeChineseText, useLanguage } from '../lib/language.jsx';
import { isJudgeModeLocation } from '../lib/judgeMode';
import crabOrangeImage from '../assets/crab-orange.png';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const cnNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const evidenceTimelineStages = [
  { key: 'decode', title: '古籍解码', desc: '从原文里抽取食材、器具和做法线索。' },
  { key: 'verify', title: '食材校验', desc: '用朝代、地域、节令约束排除不可靠想象。' },
  { key: 'convert', title: '技法推演', desc: '把古法转译成现代厨房能执行的步骤。' },
  { key: 'revive', title: '成品复原', desc: '生成菜品档案、可信度和今晚可做版本。' },
];

const cachedCrabOrangeDemo = {
  id: 'dish_001',
  name: '蟹酿橙',
  dynasty: '南宋',
  source: '《山家清供》',
  description: '以黄熟橙为器，填入蟹膏蟹肉蒸制，橙香与蟹鲜相融，是宋代文人饮食审美里“以器为味”的代表样本。',
  originalRecipe: '橙用黄熟大者，截顶去瓤，留少液。以蟹膏肉实其内，仍以带枝顶覆之。入甑，用酒、醋、水蒸熟。',
  modernRecipe: '选厚皮甜橙制成橙盅，填入蟹粉、蟹黄、少量黄酒和米醋，隔水蒸至橙香入馅。',
  confidence: 92,
  ingredients: {
    original: ['黄熟橙', '蟹膏', '蟹肉', '酒', '醋'],
    modern: ['厚皮甜橙', '大闸蟹蟹粉', '绍兴黄酒', '米醋'],
  },
  cookingSteps: [
    '选黄熟大橙，截顶后挖去果肉，保留少量橙汁。',
    '拆蟹取蟹膏与蟹肉，加少量黄酒、米醋和橙汁拌匀。',
    '将蟹馅填回橙壳，覆上橙盖，放入小盏固定。',
    '隔水蒸至蟹香与橙香融合，趁热开盖食用。',
  ],
  historicalContext: '蟹酿橙把器皿、香气和食材合为一体，体现宋代文人把日常饮食做成雅事的审美。',
  culturalSignificance: '这道菜适合现场说明“文化规则即推理规则”：器物、节令、地域和技法都约束着复原结果。',
  difficulty: '中等',
  cookingTime: '35分钟',
  tasteProfile: '鲜、酸、甜、脂香并重，橙皮清香压住蟹膏厚味。',
  techniques: ['橙盅', '蒸', '酿'],
  citations: [
    {
      excerpt: '橙用黄熟大者，截顶去瓤，留少液。',
      source_url: '#shan-jia-qing-gong-crab-orange',
      verification_note: '短摘定位到《山家清供》蟹酿橙条目，现场仅展示必要证据片段。',
      expertReviewed: true,
      license: '古籍公版材料；演示页只展示短摘。',
      copyright: '短摘用于考据定位，不替代原文出版物或数据库授权。',
      aiMode: 'cached-demo-evidence',
    },
  ],
  reasoningSteps: [
    { type: 'step', step: 1, title: '解析线索', detail: '从《山家清供》原文识别橙、蟹膏肉、酒、醋、入甑蒸等关键线索。', status: 'done' },
    { type: 'step', step: 2, title: '食材考证', detail: '黄熟橙与蟹在宋代江南语境中成立，且符合秋冬时令与文人宴饮场景。', status: 'done' },
    { type: 'step', step: 3, title: '技法推演', detail: '“截顶去瓤”“实其内”“入甑”转译为现代橙盅填馅隔水蒸。', status: 'done' },
    { type: 'step', step: 4, title: '整菜重建', detail: '输出今晚可做版本、食材替代与证据链图谱，综合置信度 92%。', status: 'done' },
  ],
  shareCard: {
    title: '我复活了一道南宋蟹酿橙',
    subtitle: '一行古书，一盏橙香蟹鲜',
    badges: ['南宋', '山家清供', '可追溯复原'],
    certificateId: 'DEMO-CRAB-ORANGE-001',
    shareText: '我在风味考古局复活了南宋蟹酿橙：以橙为盅，以蟹为馅，证据链可见。',
  },
};

const aiStatusLabel = (status = 'generated') => {
  const labels = {
    generated: { text: '真实 AI', detail: '已连接后端推理链路', className: 'border-celadon/30 bg-celadon/10 text-celadon' },
    degraded: { text: '降级', detail: '后端或外部模型不可用，使用本地证据兜底', className: 'border-tea-gold/35 bg-tea-gold/10 text-tea-gold' },
    cached: { text: '缓存演示', detail: '现场演示样例，保证评委路径不中断', className: 'border-cinnabar/30 bg-cinnabar/8 text-cinnabar' },
    local: { text: '本地规则', detail: '使用知识图谱和规则推理结果', className: 'border-ink/20 bg-paper text-ink-gray' },
  };
  return labels[status] || labels.generated;
};

const safeCardText = (value, fallback = '本地记录') => sanitizeChineseText(value, fallback);
const safeCardId = (value) => sanitizeChineseText(value, '本地证书');

const imagePromptHints = {
  蟹酿橙: '实物参考形态是单人份橙盅菜：厚皮黄橙或甜橙作为橙盅容器，一个完整厚皮黄橙截顶挖空成高边橙壳口沿，小碗或小蒸盏托住橙盅，蟹膏蟹肉填在橙壳内部，内部盛湿润蟹粉蟹黄蟹肉碎，画面中可见的蟹只能是拆出的蟹肉丝和蟹黄蟹膏，内馅齐平或略低于橙盅口沿，橙盖覆回、微开露馅或斜靠旁边；不得出现整只螃蟹，不得出现蟹腿、蟹钳、蟹壳或完整蟹身轮廓，不能用整蟹或蟹腿来说明食材来源，不要把橙片、绿叶或整蟹摆成装饰盘，不要把螃蟹当主菜。',
  槐叶冷淘: '实物参考形态是淡青绿色中式凉面，槐叶汁和面，面条根根可辨，过冷后以酱醋熟油轻拌，浅碗或陶盘盛放；不要做成热汤面、意大利面、绿色沙拉或整枝树叶铺盘。',
  玉糁羹: '实物参考形态是浅白色萝卜米糁浓羹，白萝卜煮烂与白米糁形成温润浓稠质地，小瓷碗或汤盏盛放；不要做成清汤、西式奶油汤、大块生萝卜或米饭团。',
  王太守八宝豆腐: '实物参考形态是白嫩豆腐碎或豆腐泥在浓鸡汁中的半流质豆腐羹，细碎菌菇、火腿屑、鸡屑、松子或瓜子仁均匀融入；不要完整豆腐块堆叠、麻婆豆腐红油菜或配料分区陈列。',
  炙羊肉: '实物参考形态是带脂羊肉切成厚片或大片炙烤，边缘微焦，油脂透明发亮，表面附着茴香类香料；不要整只羊、现代烤串、生肉片或西式牛排摆盘。',
  驼蹄羹: '实物参考形态是浓稠胶质肉羹，汤体琥珀色或乳白，软烂胶质肉块切成可入口小块，深碗盛放；不要出现完整骆驼脚掌、脚趾轮廓、血腥或猎奇器官形态。',
  浑羊殁忽: '实物参考形态是分切后的酿羊肉大菜，熟羊肉外层包裹鹅肉或禽肉与糯米馅，切面朝上展示层次和肉汁；不要整只羊尸体、整只鹅裸露摆盘或烤全羊宴席。',
  荷包鱼: '实物参考形态是去骨鱼身或鱼片包裹肉茸的闭合鱼包，形似鼓起的荷包，边缘收拢，少量清亮芡汁；不要整条未处理鱼、鱼头鱼尾主体、油炸鱼排或鱼丸汤。',
  荔枝腰子: '实物参考形态是猪腰花刀爆炒后卷曲成荔枝状，每块腰花有密集刀纹并裹酸甜亮芡；不要真实荔枝水果作为主体，不要生内脏、整颗腰子或水果甜品。',
  莲房鱼包: '实物参考形态是一枚莲蓬状莲房容器，多个圆孔中填满白色鱼肉馅并蒸熟，孔洞排列清晰，少量清汁；不要荷叶包饭、整条鱼摆在莲蓬旁、莲花装饰盖过主菜或寿司点心拼盘。',
  东坡肉: '实物参考形态是规整酱红方块五花肉，顶部皮面亮泽，侧面肥瘦分层清楚，底部少量浓稠红烧汁；不要肉片散炒、焦黑烤肉、生肉排骨或叉烧片。',
};

const buildRestorationImagePrompt = (dish) => [
  `${dish.name} ${dish.dynasty || ''} 复原成品图。`,
  imagePromptHints[dish.name] || dish.description || '',
  dish.originalRecipe ? `古籍依据：${dish.originalRecipe}` : '',
  '真实中式菜品摄影，必须是一道熟制可入口的单一成品菜，不要食材拼贴，不要概念海报，不要文字水印。',
].filter(Boolean).join(' ');

const normalizeRestoration = (restoration = {}) => {
  const ingredients = Array.isArray(restoration.ingredients)
    ? {
        original: restoration.ingredients.map((item) => item.name || item).filter(Boolean),
        modern: restoration.ingredients.map((item) => item.substitutes?.[0]?.name || item.name || item).filter(Boolean),
      }
    : restoration.ingredients || { original: [], modern: [] };

  return {
    id: restoration.id || restoration.dishId || restoration.dish_id || 'dish_001',
    name: restoration.dish_name || restoration.name || '未知菜品',
    dynasty: restoration.dynasty || '未知朝代',
    source: restoration.source || '未知出处',
    description: restoration.description || '',
    originalRecipe: restoration.original_text || restoration.originalRecipe || '',
    modernRecipe: restoration.modern_adaptation || restoration.modernRecipe || '',
    confidence: restoration.confidence || Math.round((restoration.match_confidence || 0.85) * 100),
    ingredients,
    cookingSteps: restoration.steps || restoration.cookingSteps || [],
    historicalContext: restoration.cultural_notes || restoration.historicalContext || '',
    culturalSignificance: restoration.culturalSignificance || restoration.cultural_notes || '',
    difficulty: restoration.difficulty || '未知',
    cookingTime: restoration.cooking_time || restoration.cookingTime || '未知',
    tasteProfile: restoration.taste_profile || restoration.tasteProfile || '',
    techniques: restoration.techniques || [],
    citations: restoration.citations || restoration.references || [],
    evidenceStatus: restoration.evidenceStatus || restoration.evidence_status || '',
    needsMoreClues: Boolean(restoration.needsMoreClues || restoration.needs_more_clues),
    fallbackReason: restoration.fallbackReason || restoration.fallback_reason || '',
    reasoningSteps: restoration.reasoningSteps || [],
    shareCard: restoration.shareCard,
  };
};

const ShareCertificate = ({ card, t }) => {
  if (!card) return null;

  const handleCopy = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(safeCardText(card.shareText || card.title, card.title || '复活证书'));
    }
  };

  return (
    <section className="share-certificate p-6">
      <p className="text-cinnabar text-xs tracking-[0.35em] mb-3">{t('复活证书', 'CERTIFICATE · Revival Certificate')}</p>
      <h3 className="text-2xl font-bold text-ink mb-2">{safeCardText(card.title, '复活证书')}</h3>
      <p className="text-sm text-smoke mb-5">{safeCardText(card.subtitle, '风味复原记录')}</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {(card.badges || []).map((badge) => (
          <span key={badge} className="px-3 py-1 bg-cinnabar/5 text-cinnabar text-xs border border-cinnabar/20">
            {safeCardText(badge, '标签')}
          </span>
        ))}
      </div>
      <div className="flex justify-between items-end border-t border-ink/10 pt-4">
        <div>
          <p className="text-xs text-smoke tracking-widest">{t('证书', 'CERTIFICATE')}</p>
          <p className="text-sm font-semibold text-ink">{safeCardId(card.certificateId)}</p>
        </div>
        <div className="seal-badge w-16 h-16 rotate-3 shadow-md">
          <span className="text-xs font-bold text-center leading-tight">复活<br />认证</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-5 w-full border border-ink/20 py-2 text-sm tracking-widest text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
      >
        复制分享文案
      </button>
    </section>
  );
};

const EvidenceTimeline = ({ activeCount = evidenceTimelineStages.length }) => (
  <div className="mb-8 grid gap-3 md:grid-cols-4">
    {evidenceTimelineStages.map((stage, index) => {
      const isActive = index < activeCount;
      return (
        <div
          key={stage.key}
          className={`archive-surface p-4 transition-all ${isActive ? 'border-cinnabar/45 bg-cinnabar/5' : 'opacity-65'}`}
        >
          <p className="mb-2 text-xs tracking-[0.28em] text-smoke">{String(index + 1).padStart(2, '0')}</p>
          <h3 className={`mb-2 text-lg font-bold ${isActive ? 'text-cinnabar' : 'text-ink'}`}>{stage.title}</h3>
          <p className="text-sm leading-relaxed text-ink-gray">{stage.desc}</p>
        </div>
      );
    })}
  </div>
);

const EvidenceGraphPanel = ({ dish }) => {
  if (!dish) return null;

  const originalIngredient = dish.ingredients?.original?.[0] || '关键食材';
  const modernIngredient = dish.ingredients?.modern?.[0] || '现代替代';
  const technique = dish.techniques?.[0] || dish.cookingSteps?.[0]?.slice(0, 8) || '核心技法';
  const placeAndTime = [dish.dynasty, dish.regions?.[0]].filter(Boolean).join(' · ') || dish.dynasty || '历史语境';
  const graphNodes = [
    { label: '古籍', value: dish.source || '古籍线索', source: '文献证据' },
    { label: '菜品', value: dish.name, source: '知识图谱' },
    { label: '食材', value: originalIngredient, source: '节点关系' },
    { label: '技法', value: technique, source: '技法推演' },
    { label: '朝代/地域', value: placeAndTime, source: '时空约束' },
    { label: '替代食材', value: modernIngredient, source: '现代厨房' },
  ];

  return (
    <section className="evidence-panel mb-16 overflow-hidden p-6 md:p-8">
      <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-sm tracking-[0.3em] text-cinnabar">证据链图谱</span>
          <h3 className="mt-3 text-2xl font-bold text-ink">从一行古书到一盘成品</h3>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-ink-gray">
          把复原过程拆成可追溯节点，现场可以清楚解释 AI 哪里在推理，哪里受知识图谱约束。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-6">
        {graphNodes.map((node, index) => (
          <div key={node.label} className="relative min-h-[132px] border border-ink/10 bg-paper/70 p-4">
            <p className="mb-2 text-xs tracking-[0.26em] text-tea-gold">{node.label}</p>
            <p className="break-words text-lg font-bold leading-snug text-ink">{node.value}</p>
            <span className="evidence-source-chip mt-4 inline-flex border border-cinnabar/20 bg-cinnabar/5 px-2 py-1 text-[11px] tracking-[0.16em] text-cinnabar">
              {node.source}
            </span>
            {index < graphNodes.length - 1 && (
              <span className="absolute -right-3 top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 items-center justify-center bg-cinnabar text-paper md:flex">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const EvidenceDrawer = ({ dish, aiStatus }) => {
  if (!dish) return null;

  const fallbackExcerpt = dish.originalRecipe
    ? `${dish.originalRecipe.slice(0, 22)}…`
    : '暂无原文短摘，等待人工补证。';
  const citations = (dish.citations?.length ? dish.citations : [{
    excerpt: fallbackExcerpt,
    source_url: dish.source || '#local-restoration-record',
    verification_note: '由当前复原档案生成的证据占位，需在正式交付前补齐馆藏或数据库定位。',
    expertReviewed: aiStatus?.text === '缓存演示',
    license: '内部演示材料；只展示短摘。',
    copyright: 'copyright note: 不展示长篇原文，版权归原始出版或馆藏方。',
    aiMode: aiStatus?.text || '本地规则',
  }]);

  return (
    <section className="evidence-drawer evidence-panel mb-16 p-6 md:p-8">
      <details open>
        <summary className="cursor-pointer text-sm font-semibold tracking-[0.3em] text-cinnabar">
          证据抽屉｜CITATIONS
        </summary>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {citations.map((citation, index) => (
            <article key={`${citation.source_url}-${index}`} className="archive-surface p-5">
              <p className="mb-2 text-xs tracking-[0.28em] text-tea-gold">短摘</p>
              <p className="border-l-2 border-cinnabar/40 pl-3 text-sm italic leading-relaxed text-ink-gray">
                “{citation.excerpt}”
              </p>
              <dl className="mt-4 space-y-2 text-sm text-ink-gray">
                <div>
                  <dt className="inline text-smoke">source_url / 内部锚点：</dt>
                  <dd className="inline break-words">{citation.source_url}</dd>
                </div>
                <div>
                  <dt className="inline text-smoke">verification_note：</dt>
                  <dd className="inline">{citation.verification_note}</dd>
                </div>
                <div>
                  <dt className="inline text-smoke">expertReviewed：</dt>
                  <dd className="inline">{citation.expertReviewed ? 'true' : 'false'}</dd>
                </div>
                <div>
                  <dt className="inline text-smoke">license：</dt>
                  <dd className="inline">{citation.license}</dd>
                </div>
                <div>
                  <dt className="inline text-smoke">copyright：</dt>
                  <dd className="inline">{citation.copyright}</dd>
                </div>
                <div>
                  <dt className="inline text-smoke">AI mode：</dt>
                  <dd className="inline">{citation.aiMode}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </details>
    </section>
  );
};

const Result = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const reasoningRef = useRef(null);
  const isJudgeMode = isJudgeModeLocation(location);
  const judgeStarMapPath = '/starmap?demo=judge';
  const [restoredDish, setRestoredDish] = useState(null);
  const [reasoningSteps, setReasoningSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [dishImage, setDishImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(aiStatusLabel('generated'));
  const [weakClueDemo, setWeakClueDemo] = useState(null);

  const loadCachedDemoResult = useCallback((fallbackReason = '后端服务暂不可用，展示已审核的蟹酿橙演示样例。') => {
    setRestoredDish(cachedCrabOrangeDemo);
    setReasoningSteps(cachedCrabOrangeDemo.reasoningSteps);
    setDishImage(crabOrangeImage);
    setImageLoading(false);
    setLoading(false);
    setIsStreaming(false);
    setError('');
    setAiStatus({ ...aiStatusLabel('cached'), detail: fallbackReason });
  }, []);

  useEffect(() => {
    let eventSource;
    let cancelled = false;

    const loadFallback = async (clues = {}) => {
      try {
        const response = await fetch(`${API_BASE}/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clues }),
        });
        const data = await response.json();
        if (!cancelled && data.success) {
          if (data.data?.needsMoreClues) {
            loadCachedDemoResult(data.data.fallbackReason || '缺少输入线索，已切换到缓存演示。');
            return;
          }
          setRestoredDish(normalizeRestoration(data.data));
          setAiStatus(aiStatusLabel(data.data?.ai?.status || data.data?.status || 'generated'));
        }
      } catch {
        if (!cancelled) loadCachedDemoResult('无法连接到后端服务，已切换到缓存演示。');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const inputText = location.state?.inputText;
    if (inputText && location.state?.useStream) {
      const startTimer = window.setTimeout(() => {
        if (cancelled) return;
        setLoading(false);
        setIsStreaming(true);
        setReasoningSteps([]);

        eventSource = new EventSource(`${API_BASE}/analyze-stream?clue=${encodeURIComponent(inputText)}`);
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'step') {
            setReasoningSteps((prev) => {
              const exists = prev.some((step) => step.step === data.step);
              return exists ? prev.map((step) => (step.step === data.step ? data : step)) : [...prev, data];
            });
          }
          if (data.type === 'result') {
            if (data.dish?.needsMoreClues) {
              const dish = normalizeRestoration(data.dish);
              setRestoredDish(dish);
              setReasoningSteps(data.dish.reasoningSteps || []);
              setAiStatus(aiStatusLabel('degraded'));
              setIsStreaming(false);
              eventSource.close();
              return;
            }
            const dish = normalizeRestoration(data.dish);
            setRestoredDish(dish);
            setReasoningSteps(data.dish.reasoningSteps || []);
            setAiStatus(aiStatusLabel(data.dish?.ai?.status || data.dish?.status || 'generated'));
            setIsStreaming(false);
            eventSource.close();
          }
          if (data.type === 'error') {
            loadCachedDemoResult(data.message || '考据链生成失败，已切换到缓存演示。');
            eventSource.close();
          }
        };
        eventSource.onerror = () => {
          loadCachedDemoResult('流式考据链连接中断，已切换到缓存演示。');
          eventSource.close();
        };
      }, 0);

      return () => {
        cancelled = true;
        window.clearTimeout(startTimer);
        if (eventSource) eventSource.close();
      };
    } else if (location.state?.analysisResult?.possibleDishes?.length > 0) {
      const possibleDishes = location.state.analysisResult.possibleDishes;
      loadFallback({ possibleDishes });
    } else if (location.state?.analysisResult?.restorations?.length > 0) {
      const resultTimer = window.setTimeout(() => {
        if (cancelled) return;
        setRestoredDish(normalizeRestoration(location.state.analysisResult.restorations[0]));
        setAiStatus(aiStatusLabel('local'));
        setLoading(false);
      }, 0);

      return () => {
        cancelled = true;
        window.clearTimeout(resultTimer);
        if (eventSource) eventSource.close();
      };
    } else {
      loadFallback();
    }

    return () => {
      cancelled = true;
      if (eventSource) eventSource.close();
    };
  }, [loadCachedDemoResult, location.state]);

  useEffect(() => {
    reasoningRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [reasoningSteps]);

  useEffect(() => {
    if (!restoredDish?.name) return;
    if (aiStatus.text === '缓存演示') return;

    const loadImage = async () => {
      setImageLoading(true);
      try {
        const prompt = buildRestorationImagePrompt(restoredDish);
        const response = await fetch(`${API_BASE}/generate-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dishId: restoredDish.id, dishName: restoredDish.name, prompt }),
        });
        const data = await response.json();
        if (data.success && data.data?.imageUrl) {
          setDishImage(data.data.imageUrl);
          if (data.data.status === 'degraded' || data.data.type === 'placeholder') {
            setAiStatus(aiStatusLabel('degraded'));
          }
        }
      } catch {
        setDishImage(crabOrangeImage);
        setAiStatus(aiStatusLabel('degraded'));
      } finally {
        setImageLoading(false);
      }
    };

    loadImage();
  }, [aiStatus.text, restoredDish]);

  const weakClueRefusal = {
    evidenceStatus: 'insufficient',
    needsMoreClues: true,
    fallbackReason: '线索只给出“很香的一道古菜”，缺少时代、地域、食材或出处，系统拒绝直接复原。',
    suggestedClues: ['补充古籍原文或口述来源', '说明大致朝代与地域', '至少给出一个可验证食材或技法'],
  };

  const handleWeakClueTest = () => {
    setWeakClueDemo(weakClueRefusal);
    setError('');
    setLoading(false);
    setIsStreaming(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center bg-paper py-16 px-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 border-2 border-cinnabar border-t-transparent rounded-full animate-spin" />
          <p className="text-ink-gray text-lg tracking-widest">正在复原历史风味...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center bg-paper py-16 px-6">
        <div className="text-center">
          <p className="text-rouge mb-6 text-lg">{error}</p>
          <button onClick={() => navigate('/input')} className="museum-button py-3 px-8 tracking-wider">
            重新输入
          </button>
        </div>
      </div>
    );
  }

  if (isStreaming || (reasoningSteps.length > 0 && !restoredDish)) {
    return (
      <div className="restoration-gallery min-h-screen w-full px-5 py-14 md:px-6 md:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="text-center mb-12">
            <span className="text-cinnabar text-sm tracking-[0.3em]">{t('考据链', 'REASONING · Evidence Chain')}</span>
            <h1 className="text-4xl font-bold text-ink mt-3">{isStreaming ? '饕餮正在考据' : '考据完成'}</h1>
          </div>
          <EvidenceTimeline activeCount={Math.max(1, Math.min(evidenceTimelineStages.length, reasoningSteps.length || 1))} />
          <div className="archive-surface space-y-1 p-4" ref={reasoningRef}>
            {reasoningSteps.map((step, index) => (
              <div key={`${step.step}-${step.title}`} className="relative flex gap-6 p-6">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-cinnabar text-paper flex items-center justify-center font-bold text-lg shadow-md">
                    {cnNumbers[step.step - 1] || step.step}
                  </div>
                  {index < reasoningSteps.length - 1 && <div className="w-px h-8 bg-ink/20 mx-auto mt-2" />}
                </div>
                <div className="flex-1 pb-4">
                  <h3 className="text-lg font-semibold mb-1 text-ink">{step.title}</h3>
                  <p className="text-sm text-ink-gray leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!restoredDish) return null;

  const displaySteps = restoredDish.reasoningSteps.length > 0 ? restoredDish.reasoningSteps : reasoningSteps;

  return (
    <div className="restoration-gallery w-full overflow-x-hidden px-5 py-14 md:px-6 md:py-16">
      <div className="mx-auto w-full max-w-[1120px]">
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <span className="text-sm tracking-[0.28em] text-cinnabar">{t('复原结果｜展柜', 'RESULT | Restoration Gallery')}</span>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-ink md:text-6xl">一道菜，复活了</h1>
          </div>
          <div className="archive-surface p-5">
            <p className="text-xs tracking-[0.3em] text-tea-gold">复原置信度</p>
            <p className="mt-2 text-5xl font-bold text-cinnabar">{restoredDish.confidence}<span className="text-lg text-smoke">%</span></p>
            <div className={`mt-4 border px-3 py-2 text-sm ${aiStatus.className}`}>
              <p className="font-semibold tracking-[0.18em]">{aiStatus.text}</p>
              <p className="mt-1 text-xs leading-relaxed opacity-80">{aiStatus.detail}</p>
            </div>
          </div>
        </section>

        {isJudgeMode && (
          <section className="judge-page-cta mb-10 grid gap-4 border border-cinnabar/25 bg-cinnabar/5 p-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
            <div>
              <p className="text-xs tracking-[0.3em] text-cinnabar">评委验证点</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-gray">可先看可信复原，也可现场证明系统会对低证据线索拒答。</p>
            </div>
            <button
              type="button"
              onClick={handleWeakClueTest}
              className="border border-ink/25 px-5 py-3 text-sm font-semibold tracking-[0.18em] text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
            >
              一键弱线索测试
            </button>
            <button
              type="button"
              onClick={() => navigate(judgeStarMapPath, { state: { judge: true } })}
              className="museum-button px-5 py-3 text-sm tracking-[0.2em]"
            >
              下一步：味觉星图
            </button>
          </section>
        )}

        {weakClueDemo && (
          <section className="low-evidence-panel evidence-panel mb-10 p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs tracking-[0.3em] text-rouge">LOW EVIDENCE REFUSAL</p>
                <h2 className="mt-2 text-2xl font-bold text-ink">弱线索测试：拒绝伪复原</h2>
              </div>
              <span className="border border-rouge/30 bg-rouge/10 px-3 py-1 text-sm font-semibold text-rouge">
                evidenceStatus={weakClueDemo.evidenceStatus}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="archive-surface p-4">
                <p className="text-xs tracking-[0.26em] text-smoke">needsMoreClues</p>
                <p className="mt-2 text-xl font-bold text-cinnabar">{String(weakClueDemo.needsMoreClues)}</p>
              </div>
              <div className="archive-surface p-4 md:col-span-2">
                <p className="text-xs tracking-[0.26em] text-smoke">fallbackReason</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-gray">{weakClueDemo.fallbackReason}</p>
              </div>
            </div>
            <ul className="mt-4 grid gap-2 text-sm text-ink-gray md:grid-cols-3">
              {weakClueDemo.suggestedClues.map((item) => (
                <li key={item} className="border-l-2 border-cinnabar/40 pl-3">{item}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-8 mb-16 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="dish-showcase flex aspect-[4/5] items-center justify-center">
              {dishImage ? (
                <img src={dishImage} alt={restoredDish.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-tea-gold">{imageLoading ? t('智能生成中...', 'AI generating...') : t('成品图', 'Dish Image')}</div>
              )}
              <div className="seal-badge absolute top-4 right-4 w-14 h-14 rotate-6 shadow-lg">
                <span className="font-bold text-xs text-center leading-tight">复原<br />成功</span>
              </div>
            </div>
          </div>

          <div className="archive-surface md:col-span-3 flex flex-col justify-center p-6 md:p-8">
            <span className="text-tea-gold text-sm tracking-[0.3em] mb-2">{restoredDish.dynasty}</span>
            <h2 className="text-5xl font-bold text-ink mb-4">{restoredDish.name}</h2>
            <p className="text-ink-gray leading-relaxed mb-6">{restoredDish.description}</p>
            <div className="flex flex-wrap gap-3 mb-6">
              <span className="px-3 py-1 bg-cinnabar/10 text-cinnabar text-sm">难度 · {restoredDish.difficulty}</span>
              <span className="px-3 py-1 bg-tea-gold/10 text-tea-gold text-sm">耗时 · {restoredDish.cookingTime}</span>
              <span className="px-3 py-1 bg-celadon/10 text-celadon text-sm">出处 · {restoredDish.source}</span>
              <span className={`border px-3 py-1 text-sm ${aiStatus.className}`}>{aiStatus.text}</span>
            </div>
            <div className="evidence-panel p-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-smoke text-xs tracking-widest">复原置信度</span>
                <span className="text-3xl font-bold text-cinnabar">{restoredDish.confidence}<span className="text-sm text-smoke">%</span></span>
              </div>
              <div className="h-1 bg-ink/10">
                <div className="h-full bg-gradient-to-r from-cinnabar to-tea-gold" style={{ width: `${restoredDish.confidence}%` }} />
              </div>
            </div>
          </div>
        </div>

        {restoredDish.originalRecipe && (
          <section className="daily-revival-panel mb-16 p-10 text-paper relative">
            <span className="text-tea-gold text-sm tracking-[0.3em] mb-4 block">{t('古籍原文', 'ORIGINAL · Historical Text')}</span>
            <p className="text-xl leading-loose font-serif italic mb-4">“{restoredDish.originalRecipe}”</p>
            <p className="text-paper/50 text-sm">—— {restoredDish.source}</p>
          </section>
        )}

        <section className="mb-16">
          <span className="text-sm tracking-[0.3em] text-cinnabar">{t('考据链', 'REASONING')}</span>
          <h3 className="my-6 text-2xl font-bold text-ink">四步可见复原</h3>
          <EvidenceTimeline />
        </section>

        <EvidenceGraphPanel dish={restoredDish} />

        <EvidenceDrawer dish={restoredDish} aiStatus={aiStatus} />

        <div className="grid md:grid-cols-2 gap-16 mb-16">
          <section className="archive-surface p-6">
            <span className="text-cinnabar text-sm tracking-[0.3em]">{t('食材', 'INGREDIENTS')}</span>
            <h3 className="text-2xl font-bold text-ink my-6">食材考证</h3>
            <p className="text-smoke text-xs tracking-widest mb-3">古代食材</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {restoredDish.ingredients.original.map((item) => (
                <span key={item} className="px-4 py-2 bg-cinnabar/5 border border-cinnabar/20 text-cinnabar text-sm">{item}</span>
              ))}
            </div>
            <p className="text-smoke text-xs tracking-widest mb-3">现代替代</p>
            <div className="flex flex-wrap gap-2">
              {restoredDish.ingredients.modern.map((item) => (
                <span key={item} className="px-4 py-2 bg-tea-gold/5 border border-tea-gold/20 text-tea-gold text-sm">{item}</span>
              ))}
            </div>
          </section>

          <section className="archive-surface p-6">
            <span className="text-cinnabar text-sm tracking-[0.3em]">{t('步骤', 'STEPS')}</span>
            <h3 className="text-2xl font-bold text-ink my-6">今晚可做步骤</h3>
            <ol className="space-y-5">
              {restoredDish.cookingSteps.map((step, index) => (
                <li key={`${index}-${step}`} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-ink text-paper flex items-center justify-center text-sm font-semibold">
                    {cnNumbers[index] || index + 1}
                  </span>
                  <span className="text-ink-gray pt-1 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {displaySteps.length > 0 && (
          <section className="evidence-panel mb-16 p-6">
            <span className="text-cinnabar text-sm tracking-[0.3em]">{t('考据链', 'REASONING')}</span>
            <h3 className="text-2xl font-bold text-ink my-6">可见考据链</h3>
            <EvidenceTimeline />
            <div className="grid md:grid-cols-4 gap-4">
              {displaySteps.map((step) => (
                <div key={step.step} className="archive-surface p-4">
                  <p className="text-cinnabar font-bold mb-2">{cnNumbers[step.step - 1]} · {step.title}</p>
                  <p className="text-sm text-ink-gray leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {restoredDish.historicalContext && (
          <section className="archive-surface mb-16 p-6">
            <span className="text-cinnabar text-sm tracking-[0.3em]">{t('文化语境', 'CONTEXT')}</span>
            <h3 className="text-2xl font-bold text-ink my-6">文化注解</h3>
            <p className="text-ink-gray leading-loose text-lg">{restoredDish.historicalContext}</p>
          </section>
        )}

        {restoredDish.shareCard && <div className="mb-16"><ShareCertificate card={restoredDish.shareCard} t={t} /></div>}

        <div className="flex flex-wrap justify-center gap-4 pt-8 border-t border-ink/10">
          <button onClick={() => navigate('/teaching', { state: { dishId: restoredDish.id, dishName: restoredDish.name } })} className="museum-button py-3 px-8 tracking-wider">
            学习制作
          </button>
          <button onClick={() => navigate('/evolution')} className="border border-ink/30 hover:border-cinnabar text-ink hover:text-cinnabar py-3 px-8 tracking-wider">
            风味进化
          </button>
          <button onClick={() => navigate(isJudgeMode ? judgeStarMapPath : '/starmap', { state: { judge: isJudgeMode } })} className="border border-ink/30 hover:border-cinnabar text-ink hover:text-cinnabar py-3 px-8 tracking-wider">
            {isJudgeMode ? '下一步：味觉星图' : '味觉星图'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Result;
