import { RESTORATION_STAGES } from '../state/museumSession.js';

export default function WorkflowRail({ stage, completedSteps, onSelect }) {
  return (
    <ol className="workflow-rail" aria-label="可信复原进度">
      {RESTORATION_STAGES.map((label, index) => {
        const reached = index <= stage || completedSteps.includes(label);
        const state = index === stage ? 'current' : reached ? 'reached' : 'pending';
        return (
          <li key={label} data-state={state}>
            <button
              type="button"
              disabled={!reached}
              aria-current={index === stage ? 'step' : undefined}
              onClick={() => onSelect(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{label}</strong>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
