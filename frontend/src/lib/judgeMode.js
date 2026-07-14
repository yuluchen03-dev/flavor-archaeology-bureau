export const judgeModeQuery = '?demo=judge';

export const judgeSteps = [
  { key: 'input', shortLabel: '线索输入', label: '线索输入', path: '/input?demo=judge' },
  { key: 'result', shortLabel: '可信复原', label: '可信复原', path: '/result?demo=judge' },
  { key: 'starmap', shortLabel: '味觉星图', label: '味觉星图', path: '/starmap?demo=judge' },
  { key: 'light', shortLabel: '轻量玩法', label: '轻量玩法', path: '/light?demo=judge' },
  { key: 'business', shortLabel: '商业价值', label: '商业价值', path: '/business-value?demo=judge' },
];

export const isJudgeModeLocation = (location = {}) => {
  const params = new URLSearchParams((location.search || '').replace(/^\?/, ''));
  return (
    params.get('demo') === 'judge'
    || params.get('state') === 'judge'
    || params.has('judge')
    || location.state?.judge === true
    || location.state?.state === 'judge'
    || location.state?.demo === 'judge'
  );
};

export const withJudgeMode = (path) => (
  path.includes('?') ? `${path}&demo=judge` : `${path}${judgeModeQuery}`
);

export const getJudgeStepIndex = (pathname = '/') => (
  judgeSteps.findIndex((step) => step.path.startsWith(`${pathname}?`))
);

export const getJudgeNextStep = (pathname = '/') => {
  const index = getJudgeStepIndex(pathname);
  if (index < 0) return judgeSteps[0];
  return judgeSteps[(index + 1) % judgeSteps.length];
};
