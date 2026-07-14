// 风味进化展厅：选择两道不同菜品作为父本，调用 fuseDishes 推演融合结果。
// 显示父本血脉、继承特征、离线规则标签和风险/不确定性提示；结果明确标注为离线规则推演。

import { useMemo, useState } from 'react';
import { museumDishes } from '../data/offlineMuseumData.js';
import { fuseDishes } from '../lib/fusionEngine.js';
import ExhibitShell from '../components/ExhibitShell.jsx';

export default function EvolutionExhibit({ onNavigate }) {
  const [parentAId, setParentAId] = useState('');
  const [parentBId, setParentBId] = useState('');
  const [result, setResult] = useState(null);

  const canFuse = parentAId && parentBId && parentAId !== parentBId;

  const parentA = useMemo(
    () => museumDishes.find((dish) => dish.id === parentAId) || null,
    [parentAId],
  );
  const parentB = useMemo(
    () => museumDishes.find((dish) => dish.id === parentBId) || null,
    [parentBId],
  );

  const handleFuse = () => {
    if (!canFuse) return;
    setResult(fuseDishes(parentAId, parentBId));
  };

  const handleReset = () => {
    setParentAId('');
    setParentBId('');
    setResult(null);
  };

  return (
    <ExhibitShell title="风味进化 · 离线规则推演" onBack={() => onNavigate('home')}>
      <div className="evolution-exhibit">
        <p className="evolution-intro">
          风味进化选择两道不同菜品作为父本，调用离线融合引擎推演融合菜品。所有结果均标注为离线规则推演，研究性复原，不替代学术定论。
        </p>

        <div className="evolution-selectors">
          <label className="evolution-selector">
            <span className="evolution-selector-label">父本 A</span>
            <select value={parentAId} onChange={(event) => setParentAId(event.target.value)}>
              <option value="">请选择菜品</option>
              {museumDishes.map((dish) => (
                <option key={dish.id} value={dish.id}>
                  {dish.name}（{dish.dynasty}）
                </option>
              ))}
            </select>
          </label>
          <label className="evolution-selector">
            <span className="evolution-selector-label">父本 B</span>
            <select value={parentBId} onChange={(event) => setParentBId(event.target.value)}>
              <option value="">请选择菜品</option>
              {museumDishes
                .filter((dish) => dish.id !== parentAId)
                .map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name}（{dish.dynasty}）
                  </option>
                ))}
            </select>
          </label>
          <div className="evolution-actions">
            <button type="button" className="evolution-action" onClick={handleFuse} disabled={!canFuse}>
              推演融合
            </button>
            <button type="button" className="evolution-action evolution-action-secondary" onClick={handleReset}>
              重置
            </button>
          </div>
          {parentAId && parentBId && parentAId === parentBId && (
            <p className="evolution-warn">请选择两道不同的菜品作为父本。</p>
          )}
        </div>

        {parentA && parentB && (
          <div className="evolution-parents">
            <div className="evolution-parent">
              <img className="evolution-parent-image" src={parentA.image} alt={parentA.name} loading="lazy" />
              <p className="evolution-parent-name">{parentA.name}</p>
              <p className="evolution-parent-meta">{parentA.dynasty} · {parentA.region}</p>
              <p className="evolution-parent-flavor">风味：{parentA.flavor || '暂无记录'}</p>
            </div>
            <div className="evolution-parent">
              <img className="evolution-parent-image" src={parentB.image} alt={parentB.name} loading="lazy" />
              <p className="evolution-parent-name">{parentB.name}</p>
              <p className="evolution-parent-meta">{parentB.dynasty} · {parentB.region}</p>
              <p className="evolution-parent-flavor">风味：{parentB.flavor || '暂无记录'}</p>
            </div>
          </div>
        )}

        {result && (
          <article className="evolution-result" aria-label="融合推演结果">
            <header className="evolution-result-header">
              <h3 className="evolution-result-title">{result.resultName}</h3>
              <span className="evolution-result-mode">{result.mode}</span>
            </header>
            <p className="evolution-result-desc">{result.description}</p>
            {result.flavor && (
              <p className="evolution-result-flavor">新风味：{result.flavor}</p>
            )}
            {result.difficulty && (
              <p className="evolution-result-difficulty">难度：{result.difficulty}</p>
            )}
            {result.dynastyInspiration && (
              <p className="evolution-result-dynasty">朝代灵感：{result.dynastyInspiration}</p>
            )}

            <section className="evolution-result-section">
              <h4 className="evolution-result-section-title">父本血脉</h4>
              <ul className="evolution-result-list">
                <li>{result.parentA.name}（{result.parentA.id}）</li>
                <li>{result.parentB.name}（{result.parentB.id}）</li>
              </ul>
            </section>

            <section className="evolution-result-section">
              <h4 className="evolution-result-section-title">继承特征</h4>
              <ul className="evolution-result-list">
                {result.inheritance.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="evolution-result-section">
              <h4 className="evolution-result-section-title">现代创新</h4>
              <ul className="evolution-result-list">
                {result.modernInnovations.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="evolution-result-section evolution-result-risks">
              <h4 className="evolution-result-section-title">风险与不确定性</h4>
              <ul className="evolution-result-list">
                {result.risks.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </section>

            <p className="evolution-result-source">
              来源：{result.source} · 本结果为离线规则推演，不替代学术定论。
            </p>
          </article>
        )}
      </div>
    </ExhibitShell>
  );
}
