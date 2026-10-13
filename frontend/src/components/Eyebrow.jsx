// 标题装饰统一组件：所有页面/区块的 eyebrow 标签都用这一种格式
// 左对齐：短线 + 文本；居中：短线 + 文本 + 短线
const lineClass = 'h-px w-8 shrink-0 bg-tea-gold';

const Eyebrow = ({ children, align = 'left', className = '' }) => {
  const text = (
    <span className={`text-sm tracking-[0.28em] text-tea-gold ${className}`}>
      {children}
    </span>
  );

  if (align === 'center') {
    return (
      <div className="inline-flex items-center gap-3" role="text">
        <span className={lineClass} aria-hidden="true" />
        {text}
        <span className={lineClass} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3" role="text">
      <span className={lineClass} aria-hidden="true" />
      {text}
    </div>
  );
};

export default Eyebrow;
