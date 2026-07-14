import CrabOrangeStage from '../components/CrabOrangeStage.jsx';
import { useMuseumSession } from '../state/MuseumSessionContext.jsx';

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
      <div className="home-overlay">
        <p className="home-kicker">南宋食谱 · 数字风味藏品 001</p>
        <h1 id="museum-home-title">风味考古局</h1>
        <p className="home-proposition">以文献为证，复原失传中国味道</p>
        <div className="home-actions">
          <button type="button" className="command-primary" onClick={() => onNavigate('restore')}>
            开始可信复原
          </button>
          <button type="button" className="command-secondary" onClick={() => onNavigate('archive')}>
            浏览风味馆藏
          </button>
        </div>
      </div>
      <div className="home-next-signal" aria-label="馆藏摘要">
        <blockquote>“以蟹膏肉实其内，仍以带枝顶覆之，入小甑蒸熟。”</blockquote>
        <dl>
          <div><dt>证据热点</dt><dd>3 项</dd></div>
          <div><dt>馆藏规模</dt><dd>40 道馆藏</dd></div>
          <div><dt>出处</dt><dd>《山家清供》</dd></div>
        </dl>
      </div>
    </section>
  );
}
