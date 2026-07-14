import { useState } from 'react';
import { Archive, Landmark, Printer } from 'lucide-react';

const UNKNOWNS = [
  '古代甑蒸的精确火候与时长',
  '酒、醋、水的具体配比',
  '黄熟大橙的品种与现代甜橙的差异',
  '蟹膏与蟹肉的具体配比',
];

export default function RestorationReport({ dish, evidence, coverage, onNavigate }) {
  const [printStatus, setPrintStatus] = useState('');
  const total = evidence.length;
  const viewed = Math.min(total, Math.round(coverage * total));
  const percentage = total ? Math.round((viewed / total) * 100) : 0;

  const printReport = () => {
    try {
      window.print();
      setPrintStatus('已打开打印界面；如设备不支持，可使用浏览器另存为 PDF。');
    } catch {
      setPrintStatus('当前设备无法打开打印界面，请使用浏览器菜单打印或另存为 PDF。');
    }
  };

  return (
    <article className="restoration-report" aria-labelledby="restoration-report-title">
      <header className="report-heading">
        <p>数字风味藏品 001 · 研究性复原</p>
        <h2 id="restoration-report-title">{dish.name}复原档案</h2>
      </header>
      <section className="report-band">
        <h3>历史复原结论</h3>
        <dl>
          <dt>朝代</dt><dd>{dish.dynasty}</dd>
          <dt>地域</dt><dd>{dish.region}</dd>
          <dt>出处</dt><dd>{dish.source || '《山家清供》卷下'}</dd>
          <dt>原文</dt><dd>{dish.passage}</dd>
          <dt>技法</dt><dd>{dish.technique}</dd>
        </dl>
      </section>
      <section className="report-band">
        <h3>现代厨房转译</h3>
        <dl>
          <dt>食材</dt><dd>现代甜橙、蟹粉或蟹肉、花雕酒、镇江香醋</dd>
          <dt>步骤</dt><dd>截顶去瓤，填入蟹粉蟹肉，覆顶封口，中火蒸制后以酒醋佐食</dd>
          <dt>火候</dt><dd>中火蒸 8–10 分钟（现代厨房推测）</dd>
        </dl>
      </section>
      <section className="report-band">
        <h3>不可确认项</h3>
        <ul>{UNKNOWNS.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="report-coverage">
        <h3>证据覆盖率</h3>
        <strong>{viewed} / {total}（{percentage}%）</strong>
        <p>覆盖率仅表示已查看证据数量，不代表学术结论强度。</p>
      </section>
      <p className="report-disclaimer">研究性复原，不替代学术定论</p>
      <div className="report-actions">
        <button type="button" onClick={printReport}>
          <Printer aria-hidden="true" size={18} />
          <span>打印复原档案</span>
        </button>
        <button type="button" onClick={() => onNavigate('archive')}>
          <Archive aria-hidden="true" size={18} />
          <span>浏览相关馆藏</span>
        </button>
        <button type="button" onClick={() => onNavigate('business')}>
          <Landmark aria-hidden="true" size={18} />
          <span>查看合作展厅</span>
        </button>
      </div>
      <p className="print-status" aria-live="polite">{printStatus}</p>
    </article>
  );
}
