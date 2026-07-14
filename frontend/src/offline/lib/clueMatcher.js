// 离线线索匹配器：基于原文段落标签评分，判断线索是否足以复原蟹酿橙。
// 弱线索必须返回"证据不足"，绝不默认加载蟹酿橙。

const CRAB_ORANGE_CLUES = [
  { id: 'orange', keyword: '橙', label: '橙壳容器（黄熟大橙截顶去瓤）', weight: 2 },
  { id: 'crab', keyword: '蟹', label: '蟹肉蟹膏（主料）', weight: 2 },
  { id: 'stuff', keyword: '实其内', label: '酿填技法（以蟹膏肉实其内）', weight: 2 },
  { id: 'steam', keyword: '甑', label: '入甑蒸制（覆顶入甑蒸熟）', weight: 1.5 },
  { id: 'ripe', keyword: '黄熟', label: '黄熟大橙（成熟度）', weight: 1 },
  { id: 'cover', keyword: '覆', label: '覆顶封口（仍以带枝顶覆之）', weight: 1 },
  { id: 'wine', keyword: '酒', label: '酒醋调味', weight: 0.5 },
  { id: 'vinegar', keyword: '醋', label: '醋盐供食', weight: 0.5 },
];

// 命中阈值：达到此分数才视为证据匹配，否则一律返回证据不足。
const MATCH_THRESHOLD = 4;

// 弱线索始终需要的最低证据指引（古籍/朝代地域/食材技法）。
const NEEDED_CLUE_BASE = [
  '古籍原文或口述来源（如《山家清供》相关条目）',
  '大致朝代与地域（如宋代江浙）',
  '可验证的食材或技法（如橙壳为器、蟹膏填馅、入甑蒸制）',
];

function scoreClues(text) {
  const matched = [];
  let score = 0;
  for (const clue of CRAB_ORANGE_CLUES) {
    if (text.includes(clue.keyword)) {
      matched.push(clue);
      score += clue.weight;
    }
  }
  return { matched, score };
}

export function matchClue(text) {
  const input = typeof text === 'string' ? text : '';
  const { matched, score } = scoreClues(input);

  if (score >= MATCH_THRESHOLD) {
    return {
      status: 'matched',
      dishId: 'dish_001',
      score,
      matchedClues: matched.map((clue) => clue.id),
      mode: '离线规则',
    };
  }

  // 证据不足：返回仍需补齐的线索，至少 3 条。
  const matchedIds = new Set(matched.map((clue) => clue.id));
  const missingLabels = CRAB_ORANGE_CLUES
    .filter((clue) => !matchedIds.has(clue.id))
    .map((clue) => clue.label);
  const neededClues = [...NEEDED_CLUE_BASE, ...missingLabels];

  return {
    status: 'insufficient',
    dishId: null,
    score,
    matchedClues: matched.map((clue) => clue.id),
    neededClues,
    mode: '离线规则',
  };
}

export const crabOrangeClueTags = CRAB_ORANGE_CLUES;
