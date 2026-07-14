// 展厅外壳：提供可访问的展厅标题与返回操作，包裹展厅内容。

export default function ExhibitShell({ title, onBack, children }) {
  return (
    <section className="exhibit-shell">
      <div className="exhibit-shell-header">
        <button type="button" className="exhibit-back" onClick={onBack} aria-label="返回首页">
          ← 返回
        </button>
        <h2 className="exhibit-title">{title}</h2>
      </div>
      <div className="exhibit-body">{children}</div>
    </section>
  );
}
