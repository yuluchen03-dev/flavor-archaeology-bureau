import { ArrowRight, FileSearch } from 'lucide-react';
import CrabOrangeStage from '../components/CrabOrangeStage.jsx';
import FeaturedFusion from '../components/FeaturedFusion.jsx';
import { useMuseumSession } from '../state/useMuseumSession.js';

const OUTCOME_STEPS = ['古籍线索', '证据复原', '菜品融合', '数字展项'];

export default function HomeExhibit({ onNavigate }) {
  const { state, dispatch } = useMuseumSession();

  return (
    <section className="museum-home" aria-labelledby="museum-home-title">
      <div className="home-artifact" aria-label="蟹酿橙数字藏品">
        <CrabOrangeStage
          variant="hero"
          selectedEvidenceId={state.selectedEvidenceId}
          modelMode={state.modelMode}
          exploded={state.exploded}
          onEvidenceSelect={(evidence) => dispatch({
            type: 'selectEvidence',
            evidenceId: evidence.id,
          })}
          onModelModeChange={(mode) => dispatch({ type: 'setModelMode', mode })}
          onExplodedChange={(value) => dispatch({ type: 'setExploded', value })}
        />
      </div>

      <article className="home-commission">
        <header className="home-commission-heading">
          <span><FileSearch aria-hidden="true" size={16} /> 策展委托</span>
          <strong>CASE · SC-001</strong>
        </header>
        <p className="home-kicker">南宋饮食文化数字展项</p>
        <h1 id="museum-home-title">风味考古局</h1>
        <p className="home-proposition">从复原到新生</p>
        <p className="home-commission-copy">
          委托方：非遗馆策展组。依据《山家清供》复原蟹酿橙，
          并将可信古菜转化为可互动、可衍生的数字展项。
        </p>
        <button type="button" className="command-primary" onClick={() => onNavigate('restore')}>
          <span>接手这宗风味案</span>
          <ArrowRight aria-hidden="true" size={18} />
        </button>
      </article>

      <aside className="home-fusion-panel">
        <FeaturedFusion onOpen={() => dispatch({ type: 'openFusion' })} />
      </aside>

      <footer className="home-outcome-chain" aria-label="策展交付流程">
        <blockquote>“以蟹膏肉实其内，仍以带枝顶覆之，入小甑蒸熟。”</blockquote>
        <ol>
          {OUTCOME_STEPS.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </li>
          ))}
        </ol>
      </footer>
    </section>
  );
}
