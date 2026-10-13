import { useEffect, useMemo, useState } from 'react';
import {
  createInitialEvolutionSelection,
  fallbackEvolutionDishes,
  normalizeEvolutionDishes,
} from './evolutionDishes';
import { sanitizeChineseText, useLanguage } from '../lib/language.jsx';
import Eyebrow from '../components/Eyebrow.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const flavorKeys = [
  ['sour', '酸'],
  ['sweet', '甜'],
  ['bitter', '苦'],
  ['spicy', '辛'],
  ['salty', '咸'],
  ['umami', '鲜'],
];

const buildFlavor = (dish) => {
  if (dish.flavor_profile) {
    return Object.fromEntries(flavorKeys.map(([key, label]) => [label, Math.round((dish.flavor_profile[key] || 0) * 100)]));
  }
  const seed = dish.name.charCodeAt(0) || 50;
  return {
    酸: 15 + (seed % 25),
    甜: 20 + (seed % 35),
    苦: 5 + (seed % 20),
    辛: 5 + (seed % 25),
    咸: 20 + (seed % 35),
    鲜: 45 + (seed % 45),
  };
};

const FlavorRadar = ({ data, size = 180, color = '#B8860B', label = '' }) => {
  const center = size / 2;
  const radius = size / 2 - 30;
  const labels = ['酸', '甜', '苦', '辛', '咸', '鲜'];
  const angles = labels.map((_, index) => (Math.PI * 2 * index) / labels.length - Math.PI / 2);
  const point = (angle, r) => ({ x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) });
  const dataPoints = angles.map((angle, index) => point(angle, radius * ((data[labels[index]] || 0) / 100)));

  return (
    <div className="flex flex-col items-center">
      {label && <p className="text-sm font-semibold text-ink mb-2 tracking-wider">{label}</p>}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.33, 0.66, 1].map((level) => (
          <polygon
            key={level}
            points={angles.map((angle) => point(angle, radius * level)).map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#8B8580"
            strokeWidth="1"
            opacity="0.3"
          />
        ))}
        {angles.map((angle, index) => {
          const end = point(angle, radius);
          return <line key={index} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#8B8580" strokeWidth="1" opacity="0.3" />;
        })}
        <polygon points={dataPoints.map((p) => `${p.x},${p.y}`).join(' ')} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" />
        {dataPoints.map((p, index) => <circle key={index} cx={p.x} cy={p.y} r="4" fill={color} />)}
        {angles.map((angle, index) => {
          const p = point(angle, radius + 18);
          return <text key={labels[index]} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="#2C2416" fontSize="13">{labels[index]}</text>;
        })}
      </svg>
    </div>
  );
};

const safeCardText = (value, fallback = '本地记录') => sanitizeChineseText(value, fallback);
const safeCardId = (value) => sanitizeChineseText(value, '本地证书');

const Certificate = ({ card, t }) => {
  if (!card) return null;

  const handleCopy = async () => {
    if (navigator.clipboard) await navigator.clipboard.writeText(safeCardText(card.shareText || card.title, card.title || '进化证书'));
  };

  return (
    <div className="bg-paper border border-cinnabar/30 p-6 relative overflow-hidden">
      <p className="text-cinnabar text-xs tracking-[0.35em] mb-3">{t('进化证书', 'EVOLUTION CERTIFICATE')}</p>
      <h3 className="text-2xl font-bold text-ink mb-2">{safeCardText(card.title, '进化证书')}</h3>
      <p className="text-sm text-smoke mb-5">{safeCardText(card.subtitle, '风味进化记录')}</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {(card.badges || []).map((badge) => (
          <span key={badge} className="px-3 py-1 bg-cinnabar/5 text-cinnabar text-xs border border-cinnabar/20">
            {safeCardText(badge, '标签')}
          </span>
        ))}
      </div>
      <div className="border-t border-ink/10 pt-4 flex justify-between items-end">
        <div>
          <p className="text-xs text-smoke tracking-widest">{t('证书', 'CERTIFICATE')}</p>
          <p className="text-sm font-semibold text-ink">{safeCardId(card.certificateId)}</p>
        </div>
        <button onClick={handleCopy} className="border border-ink/20 hover:border-cinnabar text-ink hover:text-cinnabar px-4 py-2 text-sm tracking-widest">
          复制
        </button>
      </div>
    </div>
  );
};

const Evolution = () => {
  const { t } = useLanguage();
  const [dishes, setDishes] = useState(fallbackEvolutionDishes);
  const [selectedDish1, setSelectedDish1] = useState(fallbackEvolutionDishes[0].id);
  const [selectedDish2, setSelectedDish2] = useState(fallbackEvolutionDishes[1].id);
  const [isEvolving, setIsEvolving] = useState(false);
  const [result, setResult] = useState(null);
  const [evolvedImage, setEvolvedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [evolutionError, setEvolutionError] = useState('');
  const [imageError, setImageError] = useState('');
  const [imageRetryNonce, setImageRetryNonce] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/recipe/search?limit=80`)
      .then((response) => response.json())
      .then((payload) => {
        const list = payload.data?.dishes || payload.data || payload.dishes;
        if (Array.isArray(list) && list.length > 0) {
          const nextDishes = normalizeEvolutionDishes(list);
          const nextSelection = createInitialEvolutionSelection(nextDishes);
          setDishes(nextDishes);
          setSelectedDish1(nextSelection.selectedDish1);
          setSelectedDish2(nextSelection.selectedDish2);
        }
      })
      .catch(() => setDishes(fallbackEvolutionDishes));
  }, []);

  const dish1 = useMemo(() => dishes.find((dish) => dish.id === selectedDish1), [dishes, selectedDish1]);
  const dish2 = useMemo(() => dishes.find((dish) => dish.id === selectedDish2), [dishes, selectedDish2]);

  const handleEvolve = async () => {
    if (!dish1 || !dish2 || dish1.id === dish2.id) return;
    setIsEvolving(true);
    setResult(null);
    setEvolvedImage(null);
    setEvolutionError('');
    setImageError('');

    try {
      const response = await fetch(`${API_BASE}/evolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId1: dish1.id, dishId2: dish2.id }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        setEvolutionError(data?.message || '风味融合失败，请稍后重试。');
        return;
      }
      setResult({
        dish1,
        dish2,
        evolved: data.data.newDish,
        concept: data.data.fusionConcept,
        imagePrompt: data.data.imagePrompt,
        shareCard: data.data.shareCard,
      });
    } catch {
      setEvolutionError('无法连接到服务器，请确认后端已启动后重试。');
    } finally {
      setIsEvolving(false);
    }
  };

  useEffect(() => {
    if (!result?.evolved?.name) return;
    const loadImage = async () => {
      setImageLoading(true);
      setImageError('');
      try {
        const prompt = result.imagePrompt || `${result.evolved.name}，一道完整可食用的融合菜，不要把两个原菜简单并排。`;
        const response = await fetch(`${API_BASE}/generate-image?dishName=${encodeURIComponent(result.evolved.name)}&prompt=${encodeURIComponent(prompt)}`);
        const data = await response.json();
        if (!response.ok || !data?.success || !data.data?.imageUrl) {
          setImageError(data?.message || '进化成品图生成失败，可稍后重试。');
          return;
        }
        setEvolvedImage(data.data.imageUrl);
      } catch {
        setImageError('图片生成服务暂不可用，可点击重试。');
      } finally {
        setImageLoading(false);
      }
    };
    loadImage();
  }, [result?.evolved?.name, result?.imagePrompt, imageRetryNonce]);

  const handleRetryImage = () => {
    setImageError('');
    setEvolvedImage(null);
    setImageRetryNonce((nonce) => nonce + 1);
  };

  const evolvedFlavor = result ? Object.fromEntries(
    flavorKeys.map(([, label]) => [
      label,
      Math.round((buildFlavor(result.dish1)[label] + buildFlavor(result.dish2)[label]) / 2),
    ])
  ) : null;

  const renderDishPanel = (label, selected, setter, other) => (
    <div data-testid="dish-parent-panel" className="w-full min-w-0">
      <div className="text-center mb-6">
        <span className="inline-block border border-cinnabar/30 bg-paper/80 px-4 py-1 text-xs tracking-[0.32em] text-cinnabar">{label}</span>
      </div>
              <div data-testid="dish-option-list" className="grid max-h-[420px] w-full min-w-0 grid-cols-2 gap-3 overflow-y-auto pr-1">
        {dishes.map((dish) => {
          const isSelected = selected === dish.id;
          const disabled = other === dish.id;
          return (
            <button
              key={`${label}-${dish.id}`}
              onClick={() => !disabled && setter(dish.id)}
              disabled={disabled}
              data-testid="dish-option"
              className={`min-h-[72px] w-full min-w-0 p-4 text-left transition-all border ${
                isSelected
                  ? 'bg-cinnabar text-paper border-cinnabar shadow-lg'
                  : disabled
                    ? 'bg-paper-warm/30 text-smoke cursor-not-allowed border-ink/5 opacity-50'
                    : 'archive-surface text-ink hover:border-cinnabar/50 hover:-translate-y-0.5'
              }`}
            >
              <div className="break-words text-sm font-bold leading-snug">{dish.name}</div>
              <div className={`mt-1 break-words text-xs tracking-wider ${isSelected ? 'text-paper/70' : 'text-smoke'}`}>{dish.dynasty} · {dish.difficulty}</div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div data-testid="evolution-page" className="paper-grain w-full overflow-x-hidden bg-paper px-4 py-12 md:px-6 md:py-16">
      <div data-testid="evolution-inner" className="mx-auto w-full max-w-[1120px] min-w-0">
        <div className="mb-12 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Eyebrow>{t('风味进化', 'FLAVOR EVOLUTION')}</Eyebrow>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight text-ink md:text-6xl">跨时空的风味进化</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-gray">选择两道历史菜品，在真实古菜血统约束下生成全新非遗风味。</p>
          </div>
          <div className="archive-surface hidden max-w-xs p-5 text-sm text-ink-gray md:block">
            <p className="mb-2 text-xs tracking-[0.24em] text-cinnabar">{t('实验规则', 'LAB RULE')}</p>
            只融合风味、技法和食材线索，不做双拼盘，不生成奇怪食材拼贴。
          </div>
        </div>

        <div data-testid="evolution-selection-stage" className="experiment-table relative z-10 mb-14 grid min-w-0 gap-6 p-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-8 md:p-7">
          {renderDishPanel('亲本 A', selectedDish1, setSelectedDish1, selectedDish2)}
          <div className="flex items-center justify-center md:flex-col md:pt-24">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-cinnabar bg-paper shadow-[0_18px_45px_rgba(192,58,43,0.18)]">
              <span className="text-3xl text-cinnabar font-light">+</span>
            </div>
          </div>
          {renderDishPanel('亲本 B', selectedDish2, setSelectedDish2, selectedDish1)}
        </div>

        {dish1 && dish2 && !result && (
          <div className="evidence-panel mx-auto mb-12 mt-4 max-w-4xl p-8 md:mt-8 md:p-10">
            <p className="text-center text-tea-gold text-xs tracking-[0.3em] mb-8">{t('亲本风味对比', 'PARENT FLAVOR · Comparison')}</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-12">
              <FlavorRadar data={buildFlavor(dish1)} color="#C03A2B" label={dish1.name} />
              <div className="text-3xl text-cinnabar font-light">+</div>
              <FlavorRadar data={buildFlavor(dish2)} color="#B8860B" label={dish2.name} />
            </div>
          </div>
        )}

        <div className="text-center mb-16">
          {evolutionError && (
            <div role="alert" className="mx-auto mb-6 max-w-xl border border-rouge/35 bg-rouge/10 px-5 py-3 text-sm leading-relaxed text-rouge">
              {evolutionError}
            </div>
          )}
          <button onClick={handleEvolve} disabled={!dish1 || !dish2 || dish1.id === dish2.id || isEvolving} className="museum-button px-12 py-4 text-lg tracking-[0.24em] disabled:opacity-30 md:px-16">
            {isEvolving ? '风味融合中' : '开始进化'}
          </button>
        </div>

        {result && (
          <div className="max-w-5xl mx-auto">
            <section className="archive-surface evolution-reveal-stage mb-10 overflow-hidden">
              <div className="daily-revival-panel p-10 text-center">
                <span className="text-paper/70 text-xs tracking-[0.3em]">{t('新物种', 'NEW SPECIES')}</span>
                <h2 className="text-5xl font-bold text-paper mt-4 mb-3">{result.evolved.name}</h2>
                <p className="text-paper/80 tracking-widest">{result.evolved.dynasty || '跨时空融合'}</p>
              </div>
              <div className="p-10">
                <div className="lineage-strip mb-8" aria-label={t('生成血统', 'Generated lineage')}>
                  <span className="lineage-node">{result.dish1.name}</span>
                  <span className="lineage-arrow" aria-hidden="true">→</span>
                  <span className="lineage-node">{result.dish2.name}</span>
                  <span className="lineage-arrow" aria-hidden="true">→</span>
                  <span className="lineage-node lineage-result">{result.evolved.name}</span>
                </div>
                <div className="w-full aspect-[16/9] flex flex-col items-center justify-center overflow-hidden mb-4 max-w-lg mx-auto border border-ink/10 bg-paper-warm">
                  {evolvedImage ? <img src={evolvedImage} alt={result.evolved.name} className="w-full h-full object-cover" /> : (
                    <>
                      <p className="text-tea-gold px-4 text-center">{imageLoading ? t('智能生成中...', 'AI generating...') : t('进化成品图', 'Evolution Image')}</p>
                      {imageError && !imageLoading && (
                        <div role="alert" className="mt-3 flex flex-col items-center gap-2 px-4">
                          <p className="text-center text-sm text-rouge">{imageError}</p>
                          <button
                            type="button"
                            onClick={handleRetryImage}
                            className="border border-ink/25 px-4 py-1.5 text-xs tracking-[0.2em] text-ink transition-colors hover:border-cinnabar hover:text-cinnabar"
                          >
                            重试生成
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="text-ink text-lg leading-relaxed mb-6 text-center">{result.evolved.description || result.concept}</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <span className="px-4 py-1.5 text-sm border border-cinnabar/30 text-cinnabar bg-cinnabar/[0.08]">{result.dish1.name} × {result.dish2.name}</span>
                  <span className="px-4 py-1.5 text-sm border border-tea-gold/30 text-tea-gold bg-tea-gold/[0.08]">{(result.evolved.techniques || []).join(' + ') || '约束式生成'}</span>
                </div>
              </div>
            </section>

            <section className="p-8 md:p-10 border border-ink/10 bg-paper-warm/40 mb-10">
              <p className="text-center text-tea-gold text-xs tracking-[0.3em] mb-8">{t('风味对比', 'FLAVOR COMPARISON')}</p>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <FlavorRadar data={buildFlavor(result.dish1)} color="#C03A2B" label={result.dish1.name} size={150} />
                <FlavorRadar data={buildFlavor(result.dish2)} color="#B8860B" label={result.dish2.name} size={150} />
                <div className="text-2xl text-cinnabar font-light">→</div>
                <FlavorRadar data={evolvedFlavor} color="#2C2416" label={result.evolved.name} size={150} />
              </div>
            </section>

            <div className="mb-10">
              <Certificate card={result.shareCard} t={t} />
            </div>

            <div className="text-center">
              <button onClick={() => { setResult(null); setEvolvedImage(null); }} className="px-12 py-4 border-2 border-ink text-ink tracking-[0.3em] hover:bg-ink hover:text-paper">
                重新选择
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Evolution;
