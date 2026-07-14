export const EXHIBITS = new Set(['home', 'restore', 'archive', 'business']);

export const RESTORATION_STAGES = ['装入历史线索', '古籍解码', '证据推演', '结构复原', '复原结论'];

export const INITIAL_SESSION = Object.freeze({
  activeExhibit: 'home',
  archiveTab: 'collection',
  researchTool: 'mentor',
  selectedDishId: 'dish_001',
  secondaryDishId: null,
  stage: 0,
  clueText: '',
  matchResult: null,
  selectedEvidenceId: null,
  viewedEvidenceIds: [],
  modelMode: 'historical',
  exploded: false,
  completedSteps: [],
  reducedMotion: false,
});

export function museumSessionReducer(state, action) {
  switch (action.type) {
    case 'navigate':
      return EXHIBITS.has(action.exhibit)
        ? { ...state, activeExhibit: action.exhibit }
        : state;
    case 'returnHome':
      return {
        ...state,
        activeExhibit: 'home',
        stage: 0,
        clueText: '',
        matchResult: null,
        selectedEvidenceId: null,
        viewedEvidenceIds: [],
        modelMode: 'historical',
        exploded: false,
      };
    case 'selectDish':
      return { ...state, selectedDishId: action.dishId };
    case 'selectSecondaryDish':
      return { ...state, secondaryDishId: action.dishId };
    case 'setArchiveTab':
      return { ...state, archiveTab: action.tab };
    case 'setResearchTool':
      return { ...state, researchTool: action.tool };
    case 'setStage':
      return { ...state, stage: Math.max(0, Math.min(4, action.stage)) };
    case 'setClue':
      return {
        ...state,
        clueText: action.text,
        matchResult: action.result ?? state.matchResult,
      };
    case 'setMatchResult':
      return { ...state, matchResult: action.result };
    case 'selectEvidence': {
      const viewedEvidenceIds = state.viewedEvidenceIds.includes(action.evidenceId)
        ? state.viewedEvidenceIds
        : [...state.viewedEvidenceIds, action.evidenceId];
      return { ...state, selectedEvidenceId: action.evidenceId, viewedEvidenceIds };
    }
    case 'setModelMode':
      return { ...state, modelMode: action.mode };
    case 'setExploded':
      return { ...state, exploded: Boolean(action.value) };
    case 'completeStep':
      return state.completedSteps.includes(action.step)
        ? state
        : { ...state, completedSteps: [...state.completedSteps, action.step] };
    case 'setReducedMotion':
      return { ...state, reducedMotion: Boolean(action.value) };
    default:
      return state;
  }
}

export function persistentSession(state) {
  return {
    selectedDishId: state.selectedDishId,
    completedSteps: state.completedSteps,
    reducedMotion: state.reducedMotion,
  };
}
