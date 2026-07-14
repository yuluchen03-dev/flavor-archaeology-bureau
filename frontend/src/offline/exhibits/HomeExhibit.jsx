// 博物馆首页：第一屏只有两个入口——90 秒可信复原与自由探索馆藏。
// 首屏同时暴露温和的直接操作：展示 3D 蟹酿橙，可拖拽旋转、点击热点查看证据，不强制片头。

import { useState } from 'react';
import CrabOrangeStage from '../components/CrabOrangeStage.jsx';

export default function HomeExhibit({ onNavigate }) {
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  return (
    <section className="home-exhibit">
      <h1 className="home-title">风味考古局</h1>
      <p className="home-subtitle">离线博物馆 · 可信风味复原</p>
      <div className="home-routes">
        <button
          type="button"
          className="home-route home-route-primary"
          onClick={() => onNavigate('restore')}
        >
          开始 90 秒可信复原
        </button>
        <button
          type="button"
          className="home-route home-route-secondary"
          onClick={() => onNavigate('archive')}
        >
          自由探索馆藏
        </button>
      </div>
      <div className="home-stage">
        <p className="home-stage-hint">拖拽旋转蟹酿橙，点击热点查看证据</p>
        <CrabOrangeStage onHotspotSelect={setSelectedEvidence} />
        {selectedEvidence && (
          <dl className="home-evidence-snippet">
            <dt>原文短摘</dt>
            <dd className="home-evidence-quote">{selectedEvidence.quote}</dd>
            <dt>出处 · 推断类型</dt>
            <dd className="home-evidence-meta">
              {selectedEvidence.source} · {selectedEvidence.kind} · 可信度 {selectedEvidence.confidence}
            </dd>
            <dt>说明</dt>
            <dd className="home-evidence-explanation">{selectedEvidence.explanation}</dd>
          </dl>
        )}
      </div>
      <p className="home-note">所有复原结果均标注为离线模式，研究性复原，不替代学术定论。</p>
    </section>
  );
}
