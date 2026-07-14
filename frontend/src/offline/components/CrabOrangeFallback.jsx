// 蟹酿橙分层 2.5D 备用视图：WebGL 不可用时以 SVG/CSS 绘制蒸盏、橙壳、蟹馅与顶盖分层。
// 三个证据热点对应原文短摘（运行时数据来自 crabOrangeEvidence.hotspots，不在组件内重复维护）：
//   橙壳 → 以橙为器
//   蟹馅 → 以蟹膏肉实其内
//   蒸制结构 → 覆橙顶，入甑蒸熟
// 点击热点显示原文短摘、出处、推断类型与置信状态。

import { useState } from 'react';
import { crabOrangeEvidence } from '../data/offlineMuseumData.js';

export default function CrabOrangeFallback({ onHotspotSelect }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (hotspot) => {
    setSelected(hotspot);
    if (onHotspotSelect) onHotspotSelect(hotspot);
  };

  return (
    <div className="crab-orange-fallback" role="figure" aria-label="蟹酿橙分层结构示意（2.5D 备用视图）">
      <svg className="crab-orange-fallback-svg" viewBox="0 0 220 240" aria-hidden="true">
        {/* 蒸盏 */}
        <ellipse cx="110" cy="200" rx="95" ry="20" fill="#3a4a55" />
        <path d="M15 200 Q110 245 205 200" fill="#2a3742" stroke="#5a6a75" strokeWidth="1.5" />
        {/* 橙壳 */}
        <path d="M30 160 Q30 92 110 92 Q190 92 190 160 Z" fill="#d4842a" opacity="0.92" />
        <ellipse cx="110" cy="160" rx="80" ry="13" fill="#b56a1a" />
        {/* 蟹馅 */}
        <ellipse cx="110" cy="150" rx="60" ry="20" fill="#e8d28a" />
        <ellipse cx="110" cy="146" rx="48" ry="10" fill="#f0dd9a" />
        {/* 顶盖 */}
        <path d="M40 92 Q110 52 180 92 Z" fill="#c06a1a" opacity="0.92" />
        <ellipse cx="110" cy="92" rx="70" ry="9" fill="#a05a18" />
        <line x1="110" y1="62" x2="110" y2="48" stroke="#6a3a1a" strokeWidth="2" />
      </svg>
      <ul className="crab-orange-fallback-layers" aria-label="分层结构标注">
        <li className="crab-orange-fallback-layer crab-orange-fallback-layer-lid">
          <span className="crab-orange-fallback-layer-name">顶盖</span>
          <span className="crab-orange-fallback-layer-desc">覆橙顶</span>
        </li>
        <li className="crab-orange-fallback-layer crab-orange-fallback-layer-shell">
          <span className="crab-orange-fallback-layer-name">橙壳</span>
          <span className="crab-orange-fallback-layer-desc">以橙为器</span>
        </li>
        <li className="crab-orange-fallback-layer crab-orange-fallback-layer-filling">
          <span className="crab-orange-fallback-layer-name">蟹馅</span>
          <span className="crab-orange-fallback-layer-desc">以蟹膏肉实其内</span>
        </li>
        <li className="crab-orange-fallback-layer crab-orange-fallback-layer-bowl">
          <span className="crab-orange-fallback-layer-name">蒸盏</span>
          <span className="crab-orange-fallback-layer-desc">入甑蒸熟</span>
        </li>
      </ul>
      <div className="crab-orange-fallback-hotspots" role="group" aria-label="证据热点">
        {crabOrangeEvidence.hotspots.map((hotspot) => (
          <button
            key={hotspot.id}
            type="button"
            className={`crab-orange-hotspot crab-orange-fallback-hotspot${selected && selected.id === hotspot.id ? ' is-active' : ''}`}
            onClick={() => handleSelect(hotspot)}
            title={`${hotspot.label} · ${hotspot.quote}`}
            aria-pressed={Boolean(selected && selected.id === hotspot.id)}
          >
            <span className="crab-orange-hotspot-label">{hotspot.label}</span>
            <span className="crab-orange-hotspot-quote">{hotspot.quote}</span>
          </button>
        ))}
      </div>
      {selected && (
        <dl className="crab-orange-fallback-detail">
          <dt>原文短摘</dt>
          <dd className="crab-orange-fallback-quote">{selected.quote}</dd>
          <dt>出处</dt>
          <dd className="crab-orange-fallback-source">{selected.source}</dd>
          <dt>推断类型</dt>
          <dd className={`crab-orange-fallback-kind crab-orange-fallback-kind-${selected.kind}`}>{selected.kind}</dd>
          <dt>置信状态</dt>
          <dd className="crab-orange-fallback-confidence">可信度：{selected.confidence}</dd>
          <dt>说明</dt>
          <dd className="crab-orange-fallback-explanation">{selected.explanation}</dd>
        </dl>
      )}
    </div>
  );
}
