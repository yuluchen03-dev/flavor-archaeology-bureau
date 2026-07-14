// 博物馆顶部导航：三个主要操作 + 探索馆藏次级菜单。
// 不使用路由，仅通过回调通知父组件切换展厅。

import { useState } from 'react';

const SECONDARY_NAV = [
  { key: 'archive', label: '馆藏菜品' },
  { key: 'mentor', label: '考据问答' },
  { key: 'evolution', label: '风味进化' },
  { key: 'play', label: '真假非遗' },
];

export default function MuseumHeader({ primaryNav, activeExhibit, onNavigate }) {
  const [exploreOpen, setExploreOpen] = useState(false);

  const handlePrimary = (item) => {
    if (item.key === 'explore') {
      setExploreOpen((open) => !open);
      return;
    }
    setExploreOpen(false);
    onNavigate(item.key);
  };

  const handleSecondary = (key) => {
    setExploreOpen(false);
    onNavigate(key);
  };

  return (
    <header className="museum-header">
      <nav aria-label="主展厅" className="museum-nav">
        {primaryNav.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`museum-nav-button${activeExhibit === item.key ? ' is-active' : ''}`}
            aria-expanded={item.key === 'explore' ? exploreOpen : undefined}
            aria-haspopup={item.key === 'explore' ? 'menu' : undefined}
            onClick={() => handlePrimary(item)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {exploreOpen && (
        <div className="museum-nav-secondary" role="menu" aria-label="馆藏展厅">
          {SECONDARY_NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className={`museum-nav-secondary-button${activeExhibit === item.key ? ' is-active' : ''}`}
              onClick={() => handleSecondary(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
