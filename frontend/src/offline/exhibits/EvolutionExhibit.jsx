import { useMemo, useState } from 'react';
import { museumDishes } from '../data/offlineMuseumData.js';
import { fuseDishes } from '../lib/fusionEngine.js';
import ExhibitShell from '../components/ExhibitShell.jsx';

export default function EvolutionExhibit({
  onNavigate = () => {},
  embedded = false,
  selectedDishId = 'dish_001',
}) {
  const [parentBId, setParentBId] = useState('');
  const [result, setResult] = useState(null);
  const parentAId = selectedDishId;
  const canFuse = Boolean(parentAId && parentBId && parentAId !== parentBId);
  const parentA = useMemo(
    () => museumDishes.find((dish) => dish.id === parentAId) || museumDishes[0],
    [parentAId],
  );
  const parentB = useMemo(
    () => museumDishes.find((dish) => dish.id === parentBId) || null,
    [parentBId],
  );

  const handleFuse = () => {
    if (canFuse) setResult(fuseDishes(parentAId, parentBId));
  };

  const content = (
    <div className="evolution-exhibit">
      <p className="evolution-intro">
        馆藏父本 A 已固定为 <strong>{parentA.name}</strong>。选择另一道菜作为父本 B，离线融合引擎将给出可追溯的规则推演。
      </p>
      <div className="evolution-selectors">
        <div className="evolution-parent-fixed" aria-label="父本 A">
          <span>父本 A · 当前馆藏</span>
          <strong>{parentA.name}</strong>
          <small>{parentA.dynasty} · {parentA.region} · {parentA.technique}</small>
        </div>
        <label className="evolution-selector">
          <span className="evolution-selector-label">父本 B</span>
          <select value={parentBId} onChange={(event) => { setParentBId(event.target.value); setResult(null); }}>
            <option value="">请选择另一道菜</option>
            {museumDishes.filter((dish) => dish.id !== parentAId).map((dish) => (
              <option key={dish.id} value={dish.id}>{dish.name}（{dish.dynasty}）</option>
            ))}
          </select>
        </label>
        <div className="evolution-actions">
          <button type="button" className="evolution-action" onClick={handleFuse} disabled={!canFuse}>推演融合</button>
          <button
            type="button"
            className="evolution-action evolution-action-secondary"
            onClick={() => { setParentBId(''); setResult(null); }}
          >
            重置父本 B
          </button>
        </div>
      </div>

      {parentB && (
        <div className="evolution-parents">
          {[parentA, parentB].map((parent) => (
            <div className="evolution-parent" key={parent.id}>
              <img
                className="evolution-parent-image"
                src={parent.image}
                alt={parent.name}
                loading="lazy"
                width="320"
                height="180"
              />
              <p className="evolution-parent-name">{parent.name}</p>
              <p className="evolution-parent-meta">{parent.dynasty} · {parent.region}</p>
              <p className="evolution-parent-flavor">风味：{parent.flavor || '暂无记录'}</p>
            </div>
          ))}
        </div>
      )}

      {result && (
        <article className="evolution-result" aria-label="融合推演结果">
          <header className="evolution-result-header">
            <h3 className="evolution-result-title">{result.resultName}</h3>
            <span className="evolution-result-mode">{result.mode}</span>
          </header>
          <p className="evolution-result-desc">{result.description}</p>
          {result.flavor && <p>新风味：{result.flavor}</p>}
          {result.difficulty && <p>难度：{result.difficulty}</p>}
          <div className="evolution-result-columns">
            <section>
              <h4>父本血脉</h4>
              <ul><li>{result.parentA.name}</li><li>{result.parentB.name}</li></ul>
            </section>
            <section>
              <h4>继承特征</h4>
              <ul>{result.inheritance.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
              <h4>现代创新</h4>
              <ul>{result.modernInnovations.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section className="evolution-result-risks">
              <h4>风险与不确定性</h4>
              <ul>{result.risks.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
          </div>
          <p className="evolution-result-source">来源：{result.source} · 离线规则推演，不替代学术定论。</p>
        </article>
      )}
    </div>
  );

  if (embedded) return content;
  return (
    <ExhibitShell title="风味进化 · 离线规则推演" onBack={() => onNavigate('home')}>
      {content}
    </ExhibitShell>
  );
}
