import { evidenceKinds } from '../data/offlineMuseumData.js';

const EMPTY_MESSAGE = '选择模型热点或证据条目，查看原文、来源与可信边界。';

export default function EvidenceInspector({ evidence, viewedCount, totalCount }) {
  return (
    <aside className="evidence-inspector" aria-live="polite">
      <header>
        <p className="evidence-counter">证据 {viewedCount}/{totalCount}</p>
        <h2>{evidence ? evidence.label : '证据检查器'}</h2>
      </header>
      {evidence ? (
        <dl className="evidence-record">
          <dt>原文短摘</dt>
          <dd><blockquote>{evidence.quote}</blockquote></dd>
          <dt>出处</dt>
          <dd>{evidence.source}</dd>
          <dt>证据类型</dt>
          <dd>{evidence.kind}</dd>
          <dt>可信度</dt>
          <dd>{evidence.confidence}</dd>
          <dt>争议说明</dt>
          <dd>{evidence.dispute || evidence.explanation}</dd>
        </dl>
      ) : (
        <p className="evidence-empty">{EMPTY_MESSAGE}</p>
      )}
      <div className="evidence-legend" aria-label="证据类型图例">
        <h3>证据图例</h3>
        <ul>
          {evidenceKinds.map((kind) => (
            <li key={kind}><span aria-hidden="true" />{kind}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
