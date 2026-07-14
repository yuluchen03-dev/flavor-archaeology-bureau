import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../lib/language.jsx';
import { isJudgeModeLocation } from '../lib/judgeMode';
import crabOrangeImage from '../assets/crab-orange.png';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const dynastyColors = {
  先秦: '#8B5A2B',
  汉代: '#C03A2B',
  晋代: '#6B8E7F',
  唐代: '#B8860B',
  宋代: '#4A6FA5',
  元代: '#5A7D5A',
  明代: '#A04545',
  清代: '#6B5B95',
};

const dynastyOrder = ['先秦', '汉代', '晋代', '唐代', '宋代', '元代', '明代', '清代'];
const restoredDishes = ['dish_001', 'dish_002', 'dish_003', 'dish_004', 'dish_010'];
const recommendedDishes = ['dish_005', 'dish_008', 'dish_009', 'dish_011', 'dish_014', 'dish_034'];

const localStarMapDemo = {
  points: [
    {
      id: 'dish_001',
      name: '蟹酿橙',
      dynasty: '宋代',
      difficulty: '中等',
      description: '以橙为盅、以蟹为馅的南宋文人风味样例，适合展示从古籍短摘到现代复原的证据链。',
      taste_profile: '橙香、蟹鲜、米醋微酸与黄酒香气交织。',
      source_text: '《山家清供》蟹酿橙条目短摘。',
      backgroundImage: crabOrangeImage,
    },
    {
      id: 'dish_002',
      name: '槐叶冷淘',
      dynasty: '唐代',
      difficulty: '低',
      description: '槐叶汁和面后过冷，呈现古代夏令凉食的清爽谱系。',
      taste_profile: '清草香、麦香、酱醋香。',
    },
    {
      id: 'dish_005',
      name: '玉糁羹',
      dynasty: '宋代',
      difficulty: '低',
      description: '萝卜与米糁构成的温润羹品，适合作为研学课程的易复现样例。',
      taste_profile: '清甜、米香、羹汤柔滑。',
    },
    {
      id: 'dish_008',
      name: '炙羊肉',
      dynasty: '汉代',
      difficulty: '中等',
      description: '用炙烤技法连接边地食材、香料和宴饮场景。',
      taste_profile: '脂香、焦香、辛香。',
    },
  ],
  connections: [
    { from: 'dish_001', to: 'dish_005' },
    { from: 'dish_001', to: 'dish_002' },
    { from: 'dish_002', to: 'dish_008' },
  ],
};

const getDishArchiveState = (dishId) => {
  if (restoredDishes.includes(dishId)) {
    return { key: 'restored', label: '已复原', opacity: 1 };
  }
  if (recommendedDishes.includes(dishId)) {
    return { key: 'recommended', label: '推荐复原', opacity: 0.88 };
  }
  return { key: 'pending', label: '待考据', opacity: 0.66 };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const constellationSlots = [
  { x: 50, y: 48 },
  { x: 22, y: 31 },
  { x: 78, y: 31 },
  { x: 22, y: 73 },
  { x: 78, y: 73 },
  { x: 50, y: 14 },
  { x: 50, y: 86 },
  { x: 18, y: 51 },
  { x: 82, y: 51 },
  { x: 40, y: 62 },
  { x: 62, y: 50 },
  { x: 18, y: 82 },
  { x: 82, y: 18 },
];

const getStablePoint = (dish, index, total) => {
  if (index < constellationSlots.length) {
    return constellationSlots[index];
  }

  const dynastyIndex = Math.max(0, dynastyOrder.indexOf(dish.dynasty));
  const angle = ((index / Math.max(total, 1)) * Math.PI * 2) + dynastyIndex * 0.42;
  const radius = 24 + (dynastyIndex % 4) * 8;
  return {
    x: clamp(50 + Math.cos(angle) * radius, 12, 88),
    y: clamp(50 + Math.sin(angle) * radius * 0.72, 14, 86),
  };
};

const StarMap = () => {
  const { t, sanitize } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isJudgeMode = isJudgeModeLocation(location);
  const judgeLightPath = '/light?demo=judge';
  const [selectedDynasty, setSelectedDynasty] = useState('all');
  const [dishes, setDishes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDish, setSelectedDish] = useState(null);
  const [dataMode, setDataMode] = useState('live');

  const activateLocalStarMapDemo = useCallback((reason = '后端不可用，使用本地演示数据。') => {
    setDishes(localStarMapDemo.points);
    setConnections(localStarMapDemo.connections);
    setSelectedDish(localStarMapDemo.points[0]);
    setDataMode('local-demo');
    setError('');
    return reason;
  }, []);

  const fetchStarMapData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/star-map`);
      const data = await response.json();
      if (data.success) {
        const points = data.data.points || [];
        setDishes(points);
        setConnections(data.data.connections || []);
        setDataMode('live');
        setSelectedDish((currentDish) => (
          currentDish
          || points.find((dish) => dish.name === '蟹酿橙')
          || points.find((dish) => dish.id === 'dish_001')
          || null
        ));
      } else {
        activateLocalStarMapDemo(data.message || '获取星图数据失败，使用本地演示数据。');
      }
    } catch {
      activateLocalStarMapDemo('无法连接到服务器，使用本地演示数据。');
    } finally {
      setLoading(false);
    }
  }, [activateLocalStarMapDemo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchStarMapData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchStarMapData]);

  const demoFocusDishId = dishes.find((dish) => dish.name === '蟹酿橙')?.id || 'dish_001';
  const dynasties = ['all', ...new Set(dishes.map((dish) => dish.dynasty).filter(Boolean))];
  const filteredDishes = selectedDynasty === 'all' ? dishes : dishes.filter((dish) => dish.dynasty === selectedDynasty);
  const activeDish = selectedDish || filteredDishes.find((dish) => dish.id === demoFocusDishId) || filteredDishes[0];
  const archiveDrawerStyle = activeDish?.backgroundImage
    ? { backgroundImage: `url(${activeDish.backgroundImage})` }
    : undefined;
  const archiveDrawerClassName = activeDish?.id === demoFocusDishId
    ? `archive-drawer is-demo-open self-start p-6 ${activeDish?.backgroundImage ? 'has-dish-background' : ''}`
    : `archive-drawer self-start p-6 ${activeDish?.backgroundImage ? 'has-dish-background' : ''}`;
  const nodePositions = filteredDishes.map((dish, index) => {
    const point = getStablePoint(dish, index, filteredDishes.length);
    const archiveState = getDishArchiveState(dish.id);
    const isCollected = archiveState.key === 'restored';
    const isSelected = activeDish?.id === dish.id;
    return {
      dish,
      x: point.x,
      y: point.y,
      color: dynastyColors[dish.dynasty] || '#B8860B',
      isCollected,
      archiveState,
      isSelected,
      isDemoFocus: isSelected && dish.id === demoFocusDishId,
    };
  });
  const nodeMap = new Map(nodePositions.map((node) => [node.dish.id, node]));
  const visibleConnections = connections
    .map((connection) => ({
      from: nodeMap.get(connection.from),
      to: nodeMap.get(connection.to),
    }))
    .filter((connection) => connection.from && connection.to);
  const totalCount = dishes.length;
  const collectedCount = dishes.filter((dish) => getDishArchiveState(dish.id).key === 'restored').length;
  const recommendedCount = dishes.filter((dish) => getDishArchiveState(dish.id).key === 'recommended').length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center bg-paper">
        <div className="text-center">
          <svg className="mx-auto mb-4 h-12 w-12 animate-spin text-tea-gold" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm tracking-widest text-ink-gray">{t('正在展开星图...', 'Opening constellation archive...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center bg-paper">
        <div className="text-center">
          <p className="mb-6 tracking-wider text-cinnabar">{sanitize(error)}</p>
          <button type="button" onClick={fetchStarMapData} className="museum-button px-8 py-3 tracking-widest">
            {t('重试', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-paper text-ink paper-grain overflow-x-hidden px-5 py-14 md:px-6 md:py-16">
      <div className="relative mx-auto w-full max-w-6xl">
        <section className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <p className="text-sm tracking-[0.26em] text-tea-gold">{t('味觉星图｜馆藏索引', 'STAR MAP | Collection Index')}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight text-ink md:text-6xl">
              {t('每一颗星，都是本不该消失的味道', 'Every star is a flavor that should not have vanished')}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-gray">
              {t('按朝代、线索与复原进度浏览失传菜谱，让菜名从资料库变成可点击的文化星位。', 'Browse lost dishes by dynasty, evidence, and revival progress as a living cultural constellation.')}
            </p>
          </div>

          <div className="archive-surface p-6">
            <p className="text-xs tracking-[0.3em] text-cinnabar">{t('馆藏进度', 'COLLECTION PROGRESS')}</p>
            {dataMode === 'local-demo' && (
              <div className="local-demo-status mt-3 inline-flex border border-tea-gold/35 bg-tea-gold/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-tea-gold">
                本地演示数据
              </div>
            )}
            <div className="mt-4 flex items-end gap-3">
              <span className="text-6xl font-bold text-tea-gold">{collectedCount}</span>
              <span className="pb-2 text-2xl text-ink/30">/</span>
              <span className="pb-1 text-3xl text-ink-gray">{totalCount}</span>
            </div>
            <div className="mt-5 h-1 overflow-hidden bg-ink/10">
              <div
                className="h-full bg-cinnabar transition-all duration-700"
                style={{ width: `${totalCount > 0 ? (collectedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-gray">已复原 {collectedCount} 道，推荐复原 {recommendedCount} 道，其余待考据。</p>
            {isJudgeMode && (
              <button
                type="button"
                onClick={() => navigate(judgeLightPath, { state: { judge: true } })}
                className="judge-next-cta museum-button mt-5 w-full px-5 py-3 text-sm tracking-[0.2em]"
              >
                下一步：轻量玩法
              </button>
            )}
          </div>
        </section>

        <div className="mb-8 flex flex-wrap gap-3">
          {dynasties.map((dynasty) => (
            <button
              key={dynasty}
              type="button"
              onClick={() => {
                setSelectedDynasty(dynasty);
                setSelectedDish(null);
              }}
              className={`border px-4 py-2 text-sm tracking-[0.18em] transition-all ${
                selectedDynasty === dynasty
                  ? 'border-cinnabar bg-cinnabar/5 text-cinnabar'
                  : 'border-ink/15 bg-paper/50 text-ink-gray hover:border-cinnabar/40 hover:text-cinnabar'
              }`}
            >
              {dynasty === 'all' ? t('全部朝代', 'All Dynasties') : sanitize(dynasty)}
            </button>
          ))}
        </div>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flavor-constellation min-h-[760px] md:min-h-[620px]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <ellipse className="dynasty-orbit" cx="50" cy="50" rx="39" ry="30" />
              <ellipse className="dynasty-orbit" cx="50" cy="50" rx="30" ry="22" />
              <ellipse className="dynasty-orbit" cx="50" cy="50" rx="21" ry="15" />
              {visibleConnections.map((connection, index) => (
                <line
                  key={`${connection.from.dish.id}-${connection.to.dish.id}-${index}`}
                  x1={connection.from.x}
                  y1={connection.from.y}
                  x2={connection.to.x}
                  y2={connection.to.y}
                  stroke="rgba(154, 106, 46, 0.28)"
                  strokeWidth="0.22"
                />
              ))}
            </svg>

            <div className="absolute left-7 top-7 z-10 border-l-2 border-cinnabar/50 pl-4">
              <p className="text-xs tracking-[0.26em] text-cinnabar">{t('星位', 'STAR NODES')}</p>
              <p className="mt-1 text-sm text-ink-gray">{t('点击节点查看证据档案', 'Select a node to open the archive drawer')}</p>
            </div>

            {nodePositions.map((node) => (
              <button
                key={node.dish.id}
                type="button"
                onClick={() => setSelectedDish(node.dish)}
                className={`star-node ${node.isSelected ? 'is-selected' : ''} ${node.isDemoFocus ? 'is-demo-focus' : ''} px-3 py-3 text-left`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  color: node.isCollected ? node.color : 'rgba(74, 69, 64, 0.72)',
                  opacity: node.archiveState.opacity,
                }}
              >
                <span className="block text-[11px] tracking-[0.22em] text-tea-gold">{sanitize(node.dish.dynasty) || t('未知', 'Unknown')}</span>
                <span className="mt-1 block max-w-[9rem] truncate text-base font-bold text-ink">{sanitize(node.dish.name)}</span>
                <span className="mt-1 block text-xs text-smoke">{node.archiveState.label}</span>
              </button>
            ))}
          </div>

          <aside className={archiveDrawerClassName} style={archiveDrawerStyle}>
            {activeDish?.backgroundImage && <div className="dish-background-scrim" aria-hidden="true" />}
            {activeDish ? (
              <div className="relative z-10">
                <p className="text-xs tracking-[0.3em] text-cinnabar">{t('菜品详录', 'DISH DETAIL')}</p>
                <h2 className="mt-3 text-3xl font-bold leading-tight text-ink">{sanitize(activeDish.name)}</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-cinnabar/20 bg-cinnabar/5 px-3 py-1 text-sm text-cinnabar">{sanitize(activeDish.dynasty)}</span>
                  {activeDish.difficulty && (
                    <span className="border border-ink/10 bg-paper px-3 py-1 text-sm text-ink-gray">{sanitize(activeDish.difficulty)}</span>
                  )}
                </div>
                <div className="mt-6 space-y-5">
                  <div>
                    <p className="mb-2 text-xs tracking-[0.28em] text-tea-gold">{t('描述', 'DESCRIPTION')}</p>
                    <p className="leading-relaxed text-ink-gray">{sanitize(activeDish.description, t('暂无描述', 'No description yet'))}</p>
                  </div>
                  {activeDish.taste_profile && (
                    <div>
                      <p className="mb-2 text-xs tracking-[0.28em] text-tea-gold">{t('风味', 'FLAVOR')}</p>
                      <p className="leading-relaxed text-ink-gray">{sanitize(activeDish.taste_profile)}</p>
                    </div>
                  )}
                  {activeDish.source_text && (
                    <div>
                      <p className="mb-2 text-xs tracking-[0.28em] text-tea-gold">{t('出处', 'SOURCE')}</p>
                      <p className="border-l-2 border-cinnabar/40 pl-3 text-sm italic leading-relaxed text-smoke">{sanitize(activeDish.source_text)}</p>
                    </div>
                  )}
                </div>
                <div className="mt-7 space-y-3 border-t border-ink/10 pt-6">
                  <button
                    type="button"
                    onClick={() => navigate('/result', { state: { analysisResult: { possibleDishes: [{ id: activeDish.id, name: activeDish.name }] } } })}
                    className="museum-button w-full px-5 py-3 tracking-[0.24em]"
                  >
                    {t('复原此菜', 'Restore Dish')}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/teaching', { state: { dishId: activeDish.id, dishName: activeDish.name } })}
                    className="w-full border border-ink/25 px-5 py-3 tracking-[0.24em] text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
                  >
                    {t('学习制作', 'Learn Method')}
                  </button>
                </div>
              </div>
            ) : (
              <p className="relative z-10 text-ink-gray">{t('暂无星位数据', 'No constellation data yet')}</p>
            )}
          </aside>
        </section>

        <section className="mt-10 border-t border-ink/10 pt-8">
          <p className="mb-5 text-center text-xs tracking-[0.34em] text-smoke">{t('朝代图例', 'DYNASTY LEGEND')}</p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
            {Object.entries(dynastyColors).map(([dynasty, color]) => (
              <div key={dynasty} className="flex items-center justify-center gap-2 text-sm text-ink-gray">
                <span className="inline-block h-2.5 w-2.5 rotate-45" style={{ backgroundColor: color }} />
                <span>{sanitize(dynasty)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StarMap;
