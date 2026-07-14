import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import AuthPanel from './AuthPanel';
import { ChineseTextGuard, LanguageToggle, useLanguage } from '../lib/language.jsx';
import { getJudgeNextStep, getJudgeStepIndex, isJudgeModeLocation, judgeSteps } from '../lib/judgeMode';

const Layout = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();
  const isJudgeMode = isJudgeModeLocation(location);
  const activeJudgeStep = getJudgeStepIndex(location.pathname);
  const nextJudgeStep = getJudgeNextStep(location.pathname);

  // U2: 去掉"复原结果""数字传承"两个目标页，保留5个入口级页面
  const navItems = [
    { path: '/', label: '首页' },
    { path: '/light', label: '轻量玩法' },
    { path: '/input', label: '线索输入' },
    { path: '/starmap', label: '味觉星图' },
    { path: '/evolution', label: '风味进化' },
  ];

  const closeMobile = () => setMobileOpen(false);
  const judgeDemoPath = '/input?demo=judge';

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <ChineseTextGuard />
      {/* 导航栏 */}
      <header className="archive-topbar sticky top-0 z-50 backdrop-blur-xl">
        <nav className="mx-auto grid w-full max-w-[1180px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-5 py-3 md:grid-cols-[minmax(260px,auto)_1fr_minmax(220px,270px)] md:px-6">
          <Link to="/" className="group flex min-w-0 items-center gap-3" onClick={closeMobile}>
            <div className="seal-badge h-12 w-12 shrink-0 rotate-[-2deg] transition-transform group-hover:rotate-2">
              <span className="text-center text-sm font-bold leading-tight tracking-wider">考古</span>
            </div>
            <div>
              <span className="block text-xl font-bold tracking-[0.08em] text-ink">风味考古局</span>
              <span className="block text-[11px] tracking-[0.24em] text-smoke">{t('中国风味复原计划', 'FLAVOR ARCHAEOLOGY')}</span>
            </div>
          </Link>

          {/* 桌面端导航 */}
          <div className="hidden min-w-0 flex-wrap justify-center gap-2 md:flex">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`museum-nav-link relative whitespace-nowrap px-3 py-1.5 text-sm tracking-wide ${
                  location.pathname === item.path
                    ? 'border-cinnabar/25 bg-cinnabar/8 text-cinnabar font-semibold'
                    : 'text-ink-gray hover:bg-cinnabar/5 hover:text-cinnabar'
                }`}
              >
                {item.label}
                {location.pathname === item.path && (
                  <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 bg-cinnabar"></span>
                )}
              </Link>
            ))}
          </div>

          <div className="hidden w-full justify-self-end md:flex md:items-start md:justify-end md:gap-2">
            <Link
              to={judgeDemoPath}
              className="judge-demo-link border border-cinnabar/35 bg-cinnabar/8 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-cinnabar transition-colors hover:bg-cinnabar hover:text-paper"
            >
              现场演示
            </Link>
            <LanguageToggle />
            {!isJudgeMode && <AuthPanel />}
          </div>

          {/* U1: 移动端汉堡按钮 */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 text-ink"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="菜单"
          >
            <span className={`block w-5 h-0.5 bg-ink transition-all duration-300 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-ink transition-all duration-300 ${mobileOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-0.5 bg-ink transition-all duration-300 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </nav>

        {isJudgeMode && (
          <div className="judge-mode-rail border-t border-cinnabar/15 bg-paper-warm/80 px-5 py-3">
            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="seal-badge h-9 w-9 shrink-0 text-xs font-bold">审</span>
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.3em] text-cinnabar">JUDGE MODE</p>
                  <p className="truncate text-sm text-ink-gray">评委现场 5 步路径，保留语言切换与现场演示入口。</p>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap gap-2 lg:justify-center">
                {judgeSteps.map((step, index) => (
                  <Link
                    key={step.key}
                    to={step.path}
                    state={{ judge: true }}
                    className={`judge-step-chip ${index === activeJudgeStep ? 'is-active' : ''}`}
                  >
                    <span>{index + 1}</span>
                    <strong>{step.shortLabel}</strong>
                  </Link>
                ))}
              </div>
              <Link
                to={nextJudgeStep.path}
                state={{ judge: true }}
                className="judge-next-cta shrink-0 border border-cinnabar/35 bg-cinnabar px-4 py-2 text-sm font-semibold tracking-[0.18em] text-paper"
              >
                下一步：{nextJudgeStep.shortLabel}
              </Link>
            </div>
          </div>
        )}

        {/* 移动端下拉菜单 */}
        {mobileOpen && (
          <div className="md:hidden border-t border-ink/10 bg-paper shadow-lg">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                className={`block px-6 py-3 text-sm tracking-wide border-b border-ink/5 transition-colors ${
                  location.pathname === item.path
                    ? 'text-cinnabar font-semibold bg-cinnabar/5'
                    : 'text-ink-gray hover:text-cinnabar hover:bg-cinnabar/3'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={judgeDemoPath}
              onClick={closeMobile}
              className="judge-demo-link block border-b border-ink/5 bg-cinnabar/8 px-6 py-3 text-sm font-semibold tracking-wide text-cinnabar"
            >
              现场演示
            </Link>
            <div className="px-6 py-4">
              <div className="mb-3">
                <LanguageToggle />
              </div>
              {!isJudgeMode && <AuthPanel />}
            </div>
          </div>
        )}
      </header>

      {/* 主要内容 */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* 页脚 */}
      <footer className="paper-grain mt-auto bg-ink py-12 text-paper">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="h-px w-12 bg-tea-gold/50"></span>
            <span className="text-tea-gold text-sm tracking-widest">食不厌精 脍不厌细</span>
            <span className="h-px w-12 bg-tea-gold/50"></span>
          </div>
          <p className="text-paper/80 text-sm mb-2">风味考古局 · 复活灭绝的中国非遗美食</p>
          <p className="text-paper/40 text-xs">{t('二零二六 风味考古局 · 一行古书，一桌失传的盛宴', '© 2026 FLAVOR ARCHAEOLOGY BUREAU · One old line, one lost banquet')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
