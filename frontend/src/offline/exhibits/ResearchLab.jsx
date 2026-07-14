import MentorExhibit from './MentorExhibit.jsx';
import EvolutionExhibit from './EvolutionExhibit.jsx';
import PlayExhibit from './PlayExhibit.jsx';
import { useMuseumSession } from '../state/useMuseumSession.js';

const TOOLS = [
  { key: 'mentor', label: '考据问答' },
  { key: 'evolution', label: '风味进化' },
  { key: 'play', label: '互动任务' },
];

export default function ResearchLab({ selectedDishId }) {
  const { state, dispatch } = useMuseumSession();
  return (
    <section className="research-lab" aria-label="互动研究">
      <nav className="segmented-control research-tools" aria-label="研究工具">
        {TOOLS.map((tool) => (
          <button
            key={tool.key}
            type="button"
            aria-pressed={state.researchTool === tool.key}
            onClick={() => dispatch({ type: 'setResearchTool', tool: tool.key })}
          >
            {tool.label}
          </button>
        ))}
      </nav>
      {state.researchTool === 'mentor' && <MentorExhibit embedded selectedDishId={selectedDishId} />}
      {state.researchTool === 'evolution' && <EvolutionExhibit embedded selectedDishId={selectedDishId} />}
      {state.researchTool === 'play' && <PlayExhibit embedded selectedDishId={selectedDishId} />}
    </section>
  );
}
