import { ChefHat, History, Layers3 } from 'lucide-react';
import { crabOrangeEvidence } from '../data/offlineMuseumData.js';

export default function CrabOrangeFallback({
  selectedEvidenceId = null,
  modelMode = 'historical',
  exploded = false,
  onEvidenceSelect,
  onModelModeChange,
  onExplodedChange,
  variant = 'workbench',
}) {
  const selected = crabOrangeEvidence.hotspots.find((item) => item.id === selectedEvidenceId) || null;

  return (
    <div
      className={`crab-orange-fallback crab-orange-fallback-${variant}${exploded ? ' is-exploded' : ''}${modelMode === 'modern' ? ' is-modern' : ' is-historical'}`}
      role="figure"
      aria-label="蟹酿橙分层结构示意（2.5D 备用视图）"
    >
      <p className="fallback-status">当前设备使用 2.5D 证据视图</p>
      <svg className="crab-orange-fallback-svg" viewBox="0 0 280 260" aria-hidden="true">
        <g className="fallback-layer fallback-layer-steamer">
          <ellipse cx="140" cy="220" rx="112" ry="22" fill="#6f593d" />
          <path d="M28 220 Q140 264 252 220" fill="#384b47" stroke="#52796f" strokeWidth="2" />
        </g>
        <g className="fallback-layer fallback-layer-serving-base">
          <ellipse cx="140" cy="223" rx="112" ry="22" fill="#d9d0be" />
          <path d="M28 223 Q140 248 252 223" fill="#bcb19d" />
        </g>
        <g className="fallback-layer fallback-layer-shell">
          <path d="M48 178 Q48 94 140 94 Q232 94 232 178 Z" fill="#d9822b" />
          <ellipse cx="140" cy="178" rx="92" ry="15" fill="#b8611e" />
          <path d="M60 163 Q140 190 220 163" fill="none" stroke="#f0d9a5" strokeWidth="7" opacity="0.65" />
        </g>
        <g className="fallback-layer fallback-layer-filling">
          <circle cx="105" cy="157" r="16" fill="#f0ddad" />
          <circle cx="134" cy="145" r="19" fill="#c95732" />
          <circle cx="165" cy="156" r="17" fill="#f0ddad" />
          <circle cx="145" cy="170" r="15" fill="#f6e4bb" />
        </g>
        <g className="fallback-layer fallback-layer-lid">
          <path d="M60 94 Q140 42 220 94 Z" fill="#c76c1c" />
          <ellipse cx="140" cy="94" rx="80" ry="10" fill="#a95718" />
          <path d="M140 55 Q143 37 151 28" fill="none" stroke="#526b45" strokeWidth="5" />
        </g>
      </svg>

      <div className="crab-orange-fallback-controls" role="toolbar" aria-label="备用模型控件">
        <button
          type="button"
          className={exploded ? 'is-active' : ''}
          onClick={() => onExplodedChange?.(!exploded)}
          aria-pressed={exploded}
        >
          <Layers3 aria-hidden="true" size={18} />
          <span>拆解结构</span>
        </button>
        <button
          type="button"
          className={modelMode === 'historical' ? 'is-active' : ''}
          onClick={() => onModelModeChange?.('historical')}
          aria-pressed={modelMode === 'historical'}
        >
          <History aria-hidden="true" size={18} />
          <span>历史结构</span>
        </button>
        <button
          type="button"
          className={modelMode === 'modern' ? 'is-active' : ''}
          onClick={() => onModelModeChange?.('modern')}
          aria-pressed={modelMode === 'modern'}
        >
          <ChefHat aria-hidden="true" size={18} />
          <span>现代成品</span>
        </button>
      </div>

      <div className="crab-orange-fallback-hotspots" role="group" aria-label="证据热点">
        {crabOrangeEvidence.hotspots.map((hotspot, index) => (
          <button
            key={hotspot.id}
            type="button"
            className={`evidence-annotation${selectedEvidenceId === hotspot.id ? ' is-active' : ''}`}
            onClick={() => onEvidenceSelect?.(hotspot)}
            aria-label={`${hotspot.label}：${hotspot.quote}`}
            aria-pressed={selectedEvidenceId === hotspot.id}
          >
            <span className="evidence-annotation-index">{String(index + 1).padStart(2, '0')}</span>
            <span>{hotspot.label}</span>
          </button>
        ))}
      </div>

      {selected && (
        <dl className="crab-orange-fallback-detail">
          <dt>原文短摘</dt>
          <dd className="crab-orange-fallback-quote">{selected.quote}</dd>
          <dt>出处</dt>
          <dd>{selected.source}</dd>
          <dt>证据类型</dt>
          <dd>{selected.kind}</dd>
          <dt>可信度</dt>
          <dd>{selected.confidence}</dd>
        </dl>
      )}
    </div>
  );
}
