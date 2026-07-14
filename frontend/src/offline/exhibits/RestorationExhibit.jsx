import { matchClue } from '../lib/clueMatcher.js';
import { crabOrangeEvidence, museumDishes } from '../data/offlineMuseumData.js';
import CrabOrangeStage from '../components/CrabOrangeStage.jsx';
import EvidenceInspector from '../components/EvidenceInspector.jsx';
import RestorationReport from '../components/RestorationReport.jsx';
import WorkflowRail, { RESTORATION_STAGES } from '../components/WorkflowRail.jsx';
import { useMuseumSession } from '../state/MuseumSessionContext.jsx';

const PRELOADED_CLUE = '黄熟大橙截顶去瓤，以蟹膏肉实其内，仍以带枝顶覆之，入小甑蒸熟';
const crabDish = museumDishes.find((dish) => dish.id === 'dish_001');

export default function RestorationExhibit() {
  const { state, dispatch } = useMuseumSession();
  const selectedEvidence = crabOrangeEvidence.hotspots.find(
    (hotspot) => hotspot.id === state.selectedEvidenceId,
  ) || null;
  const coverage = state.viewedEvidenceIds.length / crabOrangeEvidence.hotspots.length;
  const canAdvance = state.stage !== 0 || state.matchResult?.status === 'matched';

  const setStage = (stage) => dispatch({ type: 'setStage', stage });
  const selectEvidence = (evidence) => dispatch({
    type: 'selectEvidence',
    evidenceId: evidence.id,
  });
  const navigate = (exhibit) => dispatch({ type: 'navigate', exhibit });

  const matchCurrentClue = () => {
    dispatch({ type: 'setMatchResult', result: matchClue(state.clueText) });
  };

  const loadPreloadedClue = () => {
    dispatch({
      type: 'setClue',
      text: PRELOADED_CLUE,
      result: matchClue(PRELOADED_CLUE),
    });
  };

  const nextStage = () => {
    if (state.stage >= RESTORATION_STAGES.length - 1 || !canAdvance) return;
    dispatch({ type: 'completeStep', step: RESTORATION_STAGES[state.stage] });
    setStage(state.stage + 1);
  };

  const previousStage = () => setStage(state.stage - 1);

  const renderStageTask = () => {
    if (state.stage === 0) {
      return (
        <div className="stage-task-content">
          <p className="task-kicker">步骤 01 · 线索入口</p>
          <h1>装入历史线索</h1>
          <p>输入古籍原文、食材或技法线索。本地规则只在证据足够时进入复原流程。</p>
          <label htmlFor="restoration-clue">历史线索</label>
          <textarea
            id="restoration-clue"
            value={state.clueText}
            onChange={(event) => dispatch({ type: 'setClue', text: event.target.value })}
            rows={4}
            placeholder="例如：黄熟大橙、蟹膏肉、入小甑蒸熟"
          />
          <div className="task-actions">
            <button type="button" className="command-primary" onClick={matchCurrentClue}>匹配线索</button>
            <button type="button" className="command-secondary" onClick={loadPreloadedClue}>
              装入预置线索
            </button>
          </div>
          {state.matchResult?.status === 'matched' && (
            <p className="task-feedback is-success" role="status">
              线索匹配成功（{state.matchResult.mode}），可以进入古籍解码。
            </p>
          )}
          {state.matchResult?.status === 'insufficient' && (
            <div className="task-feedback is-warning" role="alert">
              <strong>证据不足，不会默认加载蟹酿橙。</strong>
              <ul>{state.matchResult.neededClues.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      );
    }

    if (state.stage === 1) {
      return (
        <div className="stage-task-content">
          <p className="task-kicker">步骤 02 · 文献拆解</p>
          <h1>古籍解码</h1>
          <blockquote>{crabDish.passage}</blockquote>
          <p className="task-source">出处：{crabOrangeEvidence.source}</p>
          <dl className="decoded-fields">
            <div><dt>朝代</dt><dd>{crabDish.dynasty}</dd></div>
            <div><dt>地域</dt><dd>{crabDish.region}</dd></div>
            <div><dt>食材</dt><dd>黄熟大橙、蟹膏、蟹肉</dd></div>
            <div><dt>器具</dt><dd>小甑</dd></div>
            <div><dt>技法</dt><dd>{crabDish.technique}</dd></div>
          </dl>
        </div>
      );
    }

    if (state.stage === 2) {
      return (
        <div className="stage-task-content">
          <p className="task-kicker">步骤 03 · 可信边界</p>
          <h1>证据推演</h1>
          <p>逐条打开证据，比较文献明示与跨步骤推断。模型上的编号热点与下列记录一致。</p>
          <ul className="evidence-task-list">
            {crabOrangeEvidence.hotspots.map((hotspot, index) => (
              <li key={hotspot.id}>
                <button
                  type="button"
                  aria-pressed={state.selectedEvidenceId === hotspot.id}
                  onClick={() => selectEvidence(hotspot)}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{hotspot.label}</strong>
                  <small>{hotspot.kind} · 可信度 {hotspot.confidence}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    if (state.stage === 3) {
      return (
        <div className="stage-task-content">
          <p className="task-kicker">步骤 04 · 模型验证</p>
          <h1>结构复原</h1>
          <ol className="manipulation-guide">
            <li>拖拽模型检查橙壳、填馅与覆顶关系。</li>
            <li>切换拆解结构，观察蒸盏和内瓤层次。</li>
            <li>对照历史结构与现代成品，区分文献事实和现代转译。</li>
          </ol>
        </div>
      );
    }

    return (
      <RestorationReport
        dish={crabDish}
        evidence={crabOrangeEvidence.hotspots}
        coverage={coverage}
        onNavigate={navigate}
      />
    );
  };

  return (
    <section className="restoration-workbench" data-stage={state.stage}>
      <aside className="workbench-flow">
        <WorkflowRail
          stage={state.stage}
          completedSteps={state.completedSteps}
          onSelect={setStage}
        />
      </aside>
      <div className="workbench-artifact">
        <CrabOrangeStage
          progress={coverage}
          selectedEvidenceId={state.selectedEvidenceId}
          modelMode={state.modelMode}
          exploded={state.exploded}
          onEvidenceSelect={selectEvidence}
          onModelModeChange={(mode) => dispatch({ type: 'setModelMode', mode })}
          onExplodedChange={(value) => dispatch({ type: 'setExploded', value })}
        />
        <section className="workbench-task" aria-live="polite">{renderStageTask()}</section>
      </div>
      <EvidenceInspector
        evidence={selectedEvidence}
        viewedCount={state.viewedEvidenceIds.length}
        totalCount={crabOrangeEvidence.hotspots.length}
      />
      <footer className="workbench-commands">
        <button type="button" onClick={previousStage} disabled={state.stage === 0}>上一步</button>
        <button
          type="button"
          data-testid="restoration-next"
          onClick={nextStage}
          disabled={!canAdvance || state.stage === RESTORATION_STAGES.length - 1}
        >
          {state.stage === RESTORATION_STAGES.length - 1 ? '复原完成' : '下一步'}
        </button>
      </footer>
    </section>
  );
}
