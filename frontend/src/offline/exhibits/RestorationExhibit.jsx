// 90 秒可信复原展厅：五阶段旅程——装入历史线索、古籍解码、证据推演、3D 复原、双版本结果。
// 自由输入调用 matchClue；不匹配时显示至少 3 条需要的线索类别，绝不默认加载蟹酿橙。

import { useState } from 'react';
import { matchClue } from '../lib/clueMatcher.js';
import { crabOrangeEvidence, museumDishes } from '../data/offlineMuseumData.js';
import EvidenceDrawer from '../components/EvidenceDrawer.jsx';
import CrabOrangeStage from '../components/CrabOrangeStage.jsx';

const STAGES = ['装入历史线索', '古籍解码', '证据推演', '3D 复原', '双版本结果'];

// 预置线索：来自《山家清供》卷下的蟹酿橙原文凝练。
const PRELOADED_CLUE = '黄熟大橙截顶去瓤，以蟹膏肉实其内，仍以带枝顶覆之，入小甑蒸熟';

const crabDish = museumDishes.find((dish) => dish.id === 'dish_001');

export default function RestorationExhibit({ onNavigate, onStepComplete }) {
  const [stage, setStage] = useState(0);
  const [clueText, setClueText] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const [drawerEvidence, setDrawerEvidence] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewedHotspots, setViewedHotspots] = useState(() => new Set());

  const canAdvanceFromClue = Boolean(matchResult && matchResult.status === 'matched');
  // 证据进度：已查看热点占比，驱动 3D 模型线框到材质过渡。
  const evidenceProgress = viewedHotspots.size / crabOrangeEvidence.hotspots.length;

  const handleMatch = () => {
    setMatchResult(matchClue(clueText));
  };

  const loadPreloaded = () => {
    setClueText(PRELOADED_CLUE);
    setMatchResult(matchClue(PRELOADED_CLUE));
  };

  const nextStage = () => {
    if (stage < STAGES.length - 1) {
      if (onStepComplete) onStepComplete(STAGES[stage]);
      setStage(stage + 1);
    }
  };

  const prevStage = () => {
    if (stage > 0) setStage(stage - 1);
  };

  const openEvidence = (evidence) => {
    setDrawerEvidence(evidence);
    setDrawerOpen(true);
    if (evidence && evidence.id) {
      setViewedHotspots((prev) => {
        if (prev.has(evidence.id)) return prev;
        const next = new Set(prev);
        next.add(evidence.id);
        return next;
      });
    }
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <section className={`restoration-exhibit${skipAnimation ? ' skip-animation' : ''}`}>
      <ol className="restoration-progress" aria-label="复原进度">
        {STAGES.map((label, index) => (
          <li
            key={label}
            className={`restoration-progress-step${index === stage ? ' is-current' : ''}${index < stage ? ' is-done' : ''}`}
          >
            <span className="restoration-progress-index">{index + 1}</span>
            <span className="restoration-progress-label">{label}</span>
          </li>
        ))}
      </ol>

      <label className="restoration-skip">
        <input
          type="checkbox"
          checked={skipAnimation}
          onChange={(event) => setSkipAnimation(event.target.checked)}
        />
        跳过动效
      </label>

      <div className="restoration-stage">
        {stage === 0 && (
          <div className="restoration-stage-content">
            <h3 className="restoration-stage-title">装入历史线索</h3>
            <p className="restoration-stage-desc">
              从古籍或口述中装入历史线索，离线规则将匹配可信复原依据。
            </p>
            <textarea
              className="restoration-clue-input"
              value={clueText}
              onChange={(event) => setClueText(event.target.value)}
              placeholder="输入古籍原文、食材或技法线索…"
              rows={3}
            />
            <div className="restoration-clue-actions">
              <button type="button" className="restoration-action" onClick={handleMatch}>
                匹配线索
              </button>
              <button type="button" className="restoration-action restoration-action-secondary" onClick={loadPreloaded}>
                装入预置线索（蟹酿橙 · 《山家清供》）
              </button>
            </div>
            {matchResult && matchResult.status === 'matched' && (
              <p className="restoration-clue-result restoration-clue-matched">
                线索匹配成功（{matchResult.mode}），可进入古籍解码。
              </p>
            )}
            {matchResult && matchResult.status === 'insufficient' && (
              <div className="restoration-clue-result restoration-clue-insufficient">
                <p className="restoration-clue-status">证据不足：当前线索无法匹配可信复原依据，不会默认加载蟹酿橙。</p>
                <p className="restoration-clue-needed-title">仍需补齐以下线索类别：</p>
                <ul className="restoration-clue-needed">
                  {matchResult.neededClues.slice(0, 5).map((clue, index) => (
                    <li key={index}>{clue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {stage === 1 && (
          <div className="restoration-stage-content">
            <h3 className="restoration-stage-title">古籍解码</h3>
            <p className="restoration-stage-source">出处：{crabOrangeEvidence.source}</p>
            <blockquote className="restoration-passage">{crabDish.passage}</blockquote>
            <dl className="restoration-meta">
              <dt>菜名</dt>
              <dd>{crabDish.name}</dd>
              <dt>朝代</dt>
              <dd>{crabDish.dynasty}</dd>
              <dt>地域</dt>
              <dd>{crabDish.region}</dd>
              <dt>技法</dt>
              <dd>{crabDish.technique}</dd>
              <dt>风味</dt>
              <dd>{crabDish.flavor}</dd>
            </dl>
          </div>
        )}

        {stage === 2 && (
          <div className="restoration-stage-content">
            <h3 className="restoration-stage-title">证据推演</h3>
            <p className="restoration-stage-desc">
              以下为蟹酿橙的关键证据热点，点击查看原文短摘、出处与推断类型。
            </p>
            <ul className="restoration-evidence-list">
              {crabOrangeEvidence.hotspots.map((hotspot) => (
                <li key={hotspot.id} className="restoration-evidence-item">
                  <button
                    type="button"
                    className="restoration-evidence-trigger"
                    onClick={() => openEvidence(hotspot)}
                  >
                    <span className="restoration-evidence-label">{hotspot.label}</span>
                    <span className={`restoration-evidence-kind restoration-evidence-kind-${hotspot.kind}`}>
                      {hotspot.kind}
                    </span>
                    <span className="restoration-evidence-confidence">可信度：{hotspot.confidence}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage === 3 && (
          <div className="restoration-stage-content">
            <h3 className="restoration-stage-title">3D 复原</h3>
            <p className="restoration-stage-desc">
              拖拽旋转蟹酿橙模型，点击热点打开与证据抽屉相同的记录。已查看 {viewedHotspots.size}/
              {crabOrangeEvidence.hotspots.length} 项证据，进度驱动模型材质过渡。
            </p>
            <CrabOrangeStage progress={evidenceProgress} onHotspotSelect={openEvidence} />
          </div>
        )}

        {stage === 4 && (
          <div className="restoration-stage-content">
            <h3 className="restoration-stage-title">双版本结果</h3>
            <div className="restoration-result-grid">
              <div className="restoration-result-card restoration-result-historical">
                <h4 className="restoration-result-card-title">历史复原档案</h4>
                <dl className="restoration-result-meta">
                  <dt>菜名</dt>
                  <dd>{crabDish.name}</dd>
                  <dt>朝代</dt>
                  <dd>{crabDish.dynasty}</dd>
                  <dt>地域</dt>
                  <dd>{crabDish.region}</dd>
                  <dt>出处</dt>
                  <dd>{crabOrangeEvidence.source}</dd>
                  <dt>原文</dt>
                  <dd>{crabDish.passage}</dd>
                  <dt>技法</dt>
                  <dd>{crabDish.technique}</dd>
                </dl>
              </div>
              <div className="restoration-result-card restoration-result-modern">
                <h4 className="restoration-result-card-title">现代厨房转译</h4>
                <dl className="restoration-result-meta">
                  <dt>食材</dt>
                  <dd>现代甜橙、蟹粉/蟹肉、花雕酒、镇江香醋</dd>
                  <dt>步骤</dt>
                  <dd>截顶去瓤 → 填入蟹粉蟹肉 → 覆顶封口 → 蒸锅中火蒸制 → 酒醋佐食</dd>
                  <dt>火候</dt>
                  <dd>中火蒸 8–10 分钟（现代厨房推测）</dd>
                </dl>
              </div>
            </div>
            <div className="restoration-unconfirmed">
              <h4 className="restoration-unconfirmed-title">不可确认内容</h4>
              <ul className="restoration-unconfirmed-list">
                <li>古代甑蒸的精确火候与时长</li>
                <li>酒、醋、水的具体配比</li>
                <li>黄熟大橙的品种与现代甜橙的差异</li>
                <li>蟹膏与蟹肉的具体配比</li>
              </ul>
            </div>
            <p className="restoration-disclaimer">研究性复原，不替代学术定论</p>
            <button
              type="button"
              className="restoration-action restoration-action-business"
              onClick={() => onNavigate('business')}
            >
              了解博物馆合作方案
            </button>
          </div>
        )}
      </div>

      <div className="restoration-controls">
        <button type="button" className="restoration-control" onClick={prevStage} disabled={stage === 0}>
          上一步
        </button>
        {stage < STAGES.length - 1 && (
          <button
            type="button"
            className="restoration-control restoration-control-next"
            onClick={nextStage}
            disabled={stage === 0 && !canAdvanceFromClue}
          >
            下一步
          </button>
        )}
      </div>

      <EvidenceDrawer evidence={drawerEvidence} open={drawerOpen} onClose={closeDrawer} />
    </section>
  );
}
