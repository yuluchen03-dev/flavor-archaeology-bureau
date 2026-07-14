// 证据抽屉：抽屉式证据详情，展示原文短摘、出处、推断类型、版权说明与争议点。
// 使用 evidenceKinds 的五种状态标注每条证据的可信等级。

import { evidenceKinds } from '../data/offlineMuseumData.js';

const KIND_DESCRIPTIONS = {
  '文献明确记载': '原文有明确记载，可信度最高，可直接作为复原依据',
  '跨资料推断': '结合多条资料推断，需交叉验证后使用',
  '现代转译': '基于现代厨房转译，非古籍原文，仅作参考',
  '证据不足': '现有线索不足，不可作为复原依据，需补充来源',
  '待专家复核': '已有线索但存疑，需专家复核确认后方可采用',
};

export default function EvidenceDrawer({ evidence, open, onClose }) {
  if (!evidence) return null;
  const kind = evidence.kind || '待专家复核';

  return (
    <aside className={`evidence-drawer${open ? ' is-open' : ''}`} aria-hidden={!open} aria-label="证据详情抽屉">
      <div className="evidence-drawer-header">
        <h3 className="evidence-drawer-title">证据详情</h3>
        <button type="button" className="evidence-drawer-close" onClick={onClose} aria-label="关闭证据抽屉">
          关闭
        </button>
      </div>
      <dl className="evidence-detail">
        <dt>原文短摘</dt>
        <dd className="evidence-quote">{evidence.quote || '暂无原文摘录'}</dd>
        <dt>出处</dt>
        <dd className="evidence-source">{evidence.source || '暂无出处'}</dd>
        <dt>推断类型</dt>
        <dd className={`evidence-kind evidence-kind-${kind}`}>{kind}</dd>
        <dt>说明</dt>
        <dd className="evidence-explanation">{evidence.explanation || ''}</dd>
        <dt>版权说明</dt>
        <dd className="evidence-copyright">引文为面向展项的精炼表述，来源指向原典，转载需注明出处。</dd>
        <dt>争议点</dt>
        <dd className="evidence-dispute">{evidence.dispute || '跨步骤推断需专家复核火候与食材替代，暂无明确争议。'}</dd>
      </dl>
      <div className="evidence-kinds-legend">
        <p className="evidence-kinds-title">证据等级说明</p>
        <ul className="evidence-kinds-list">
          {evidenceKinds.map((item) => (
            <li key={item} className={`evidence-kind-item evidence-kind-${item}`}>
              <span className="evidence-kind-label">{item}</span>
              <span className="evidence-kind-desc">{KIND_DESCRIPTIONS[item]}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
