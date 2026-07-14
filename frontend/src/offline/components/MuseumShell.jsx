import { Archive, FlaskConical, Landmark } from 'lucide-react';

const NAV_ITEMS = [
  { key: 'restore', label: '可信复原台', Icon: FlaskConical },
  { key: 'archive', label: '风味馆藏库', Icon: Archive },
  { key: 'business', label: '合作展厅', Icon: Landmark },
];

export default function MuseumShell({ activeExhibit, onNavigate, children }) {
  const navigation = (className) => (
    <nav className={className} aria-label="数字博物馆主导航">
      {NAV_ITEMS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className="museum-destination"
          aria-current={activeExhibit === key ? 'page' : undefined}
          onClick={() => onNavigate(key)}
        >
          <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );

  return (
    <div className="museum-shell">
      <a className="museum-skip-link" href="#museum-main-content">跳到主要内容</a>
      <aside className="museum-rail">
        <button className="museum-brand" type="button" onClick={() => onNavigate('home')}>
          <span className="museum-seal" aria-hidden="true">味</span>
          <span>
            <strong>风味考古局</strong>
            <small>数字风味博物馆</small>
          </span>
        </button>
        {navigation('museum-desktop-nav')}
        <p className="museum-offline-state"><span aria-hidden="true" />离线评审模式</p>
      </aside>
      <div className="museum-viewport">
        <header className="museum-topbar">
          <span>研究性复原 · 不替代学术定论</span>
          <span>40 道馆藏 · 本地证据库</span>
        </header>
        <main id="museum-main-content" className="museum-content" tabIndex="-1">{children}</main>
      </div>
      {navigation('museum-mobile-nav')}
    </div>
  );
}
