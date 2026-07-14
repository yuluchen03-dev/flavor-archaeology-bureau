// 离线博物馆应用根组件：使用有限展厅键集合代替 URL 路由。
// 只持久化已完成的步骤和偏好，不持久化上传的图片。

import { useEffect, useState } from 'react';
import MuseumHeader from './components/MuseumHeader.jsx';
import ExhibitShell from './components/ExhibitShell.jsx';
import HomeExhibit from './exhibits/HomeExhibit.jsx';
import RestorationExhibit from './exhibits/RestorationExhibit.jsx';
import BusinessExhibit from './exhibits/BusinessExhibit.jsx';
import { loadProgress, saveProgress } from './lib/progressStore.js';

// 有限展厅键集合，不使用 BrowserRouter。
const exhibits = new Set(['home', 'restore', 'archive', 'mentor', 'evolution', 'play', 'business']);

// 三个主要导航操作：可信复原、探索馆藏、商业合作。
const PRIMARY_NAV = [
  { key: 'restore', label: '可信复原' },
  { key: 'explore', label: '探索馆藏' },
  { key: 'business', label: '商业合作' },
];

const SECONDARY_TITLES = {
  archive: '馆藏菜品',
  mentor: '考据问答',
  evolution: '风味进化',
  play: '真假非遗',
};

function SecondaryExhibit({ exhibitKey, onNavigate }) {
  return (
    <ExhibitShell title={SECONDARY_TITLES[exhibitKey]} onBack={() => onNavigate('home')}>
      <p className="exhibit-placeholder">
        离线评审模式下，{SECONDARY_TITLES[exhibitKey]}展厅数据已就绪，完整交互将在后续版本呈现。
      </p>
      <button type="button" className="exhibit-placeholder-action" onClick={() => onNavigate('restore')}>
        前往可信复原
      </button>
    </ExhibitShell>
  );
}

export default function OfflineApp() {
  const [activeExhibit, setActiveExhibit] = useState('home');
  // 惰性初始化：挂载时读取已持久化的进度（仅步骤与偏好，不含图片）。
  const [completedSteps, setCompletedSteps] = useState(() => {
    const progress = loadProgress();
    return Array.isArray(progress.completedSteps) ? progress.completedSteps : [];
  });

  // 完成步骤变化时持久化。
  useEffect(() => {
    saveProgress({ completedSteps });
  }, [completedSteps]);

  const navigate = (exhibit) => {
    if (exhibits.has(exhibit)) {
      setActiveExhibit(exhibit);
    }
  };

  const markStepComplete = (step) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  };

  return (
    <div className="offline-museum">
      <p className="offline-status">离线评审模式</p>
      <MuseumHeader primaryNav={PRIMARY_NAV} activeExhibit={activeExhibit} onNavigate={navigate} />
      <main className="offline-main">
        {activeExhibit === 'home' && <HomeExhibit onNavigate={navigate} />}
        {activeExhibit === 'restore' && (
          <RestorationExhibit onNavigate={navigate} onStepComplete={markStepComplete} />
        )}
        {activeExhibit === 'business' && <BusinessExhibit onNavigate={navigate} />}
        {['archive', 'mentor', 'evolution', 'play'].includes(activeExhibit) && (
          <SecondaryExhibit exhibitKey={activeExhibit} onNavigate={navigate} />
        )}
      </main>
    </div>
  );
}
