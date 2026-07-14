// 离线融合引擎：优先使用明确的进化规则，否则用确定性回退。
// 所有结果均标注为"离线规则推演"，不调用外部 API。

import { museumDishes, offlineEvolutionRules } from '../data/offlineMuseumData.js';

const dishById = new Map(museumDishes.map((dish) => [dish.id, dish]));
const evolutionResults = (offlineEvolutionRules && offlineEvolutionRules.evolution_results) || [];

function findRuleResult(nameA, nameB) {
  for (const result of evolutionResults) {
    const p1 = result.parent1;
    const p2 = result.parent2;
    if ((p1 === nameA && p2 === nameB) || (p1 === nameB && p2 === nameA)) {
      return result;
    }
  }
  return null;
}

// 基于父菜品名称的确定性回退命名。
function fallbackName(nameA, nameB) {
  const head = nameA ? nameA.slice(0, 1) : '风';
  const tail = nameB ? nameB.slice(-1) : '味';
  return `${head}香${tail}新风盘`;
}

export function fuseDishes(parentAId, parentBId) {
  const a = dishById.get(parentAId);
  const b = dishById.get(parentBId);
  const nameA = (a && a.name) || parentAId;
  const nameB = (b && b.name) || parentBId;

  const base = {
    mode: '离线规则推演',
    parentA: { id: parentAId, name: nameA },
    parentB: { id: parentBId, name: nameB },
  };

  const rule = findRuleResult(nameA, nameB);
  if (rule) {
    return {
      ...base,
      resultName: rule.result_name,
      description: rule.description,
      flavor: rule.new_flavor || null,
      difficulty: rule.difficulty || '',
      dynastyInspiration: rule.dynasty_inspiration || '',
      inheritance: [
        `继承 ${nameA} 的核心风味与食材结构`,
        `继承 ${nameB} 的形态或技法脉络`,
      ],
      modernInnovations: [
        '以现代食材替代灭绝或罕见原料',
        '调整火候与调味以适配当代厨房',
      ],
      risks: [
        '离线规则推演，风味配比需厨师试做校准',
        '若涉及罕见食材，需先确认替代品合规性',
      ],
      source: '离线进化规则',
    };
  }

  // 确定性回退：基于父菜品名称与风味特征推演。
  return {
    ...base,
    resultName: fallbackName(nameA, nameB),
    description: `基于 ${nameA} 与 ${nameB} 的风味特征，离线规则推演出融合菜品。`,
    flavor: null,
    difficulty: '中等',
    dynastyInspiration: '',
    inheritance: [
      `继承 ${nameA} 的风味基调`,
      `继承 ${nameB} 的料理结构`,
    ],
    modernInnovations: [
      '采用本地可得的现代食材复刻',
      '融合调味以适应当代口味',
    ],
    risks: [
      '确定性回退推演，缺少明确古籍进化规则',
      '需专家复核后再用于展项展示',
    ],
    source: '确定性回退',
  };
}
