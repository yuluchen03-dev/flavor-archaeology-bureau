// 离线祖先匹配器：使用图片文件名与描述关键词匹配内置风味谱系。
// 始终返回"离线推测"，仅作风味谱系参考，不替代文献考据。

import { museumDishes } from '../data/offlineMuseumData.js';

// 内置风味谱系：覆盖古代名菜与代表性非遗菜品的命名词链。
const LINEAGE_CLUES = [
  { ancestorId: 'dish_001', name: '蟹酿橙', keywords: ['橙', '蟹', '酿', '甑', '蟹粉', '橙香'] },
  { ancestorId: 'dish_002', name: '槐叶冷淘', keywords: ['槐', '冷淘', '冷面', '叶汁'] },
  { ancestorId: 'dish_004', name: '王太守八宝豆腐', keywords: ['豆腐', '八宝', '鸡汁'] },
  { ancestorId: 'dish_010', name: '东坡肉', keywords: ['东坡', '红烧', '猪肉', '五花肉'] },
  { ancestorId: 'dish_011', name: '柳州螺蛳粉', keywords: ['螺蛳', '米粉', '酸笋'] },
  { ancestorId: 'dish_016', name: '兰州牛肉面', keywords: ['牛肉面', '拉面', '清汤'] },
  { ancestorId: 'dish_034', name: '北京烤鸭', keywords: ['烤鸭', '鸭皮', '卷饼'] },
  { ancestorId: 'dish_037', name: '羊肉泡馍', keywords: ['泡馍', '羊肉', '饦饦'] },
];

function scoreAncestor(clue, text) {
  let score = 0;
  const hitKeywords = [];
  for (const keyword of clue.keywords) {
    if (text.includes(keyword)) {
      score += 1;
      hitKeywords.push(keyword);
    }
  }
  return { score, hitKeywords };
}

export function matchAncestor({ description = '', imageName = '' } = {}) {
  const text = `${description || ''} ${imageName || ''}`;

  let best = null;
  let bestScore = 0;
  let bestHits = [];
  for (const clue of LINEAGE_CLUES) {
    const { score, hitKeywords } = scoreAncestor(clue, text);
    if (score > bestScore) {
      bestScore = score;
      best = clue;
      bestHits = hitKeywords;
    }
  }

  if (!best || bestScore === 0) {
    return {
      status: '离线推测',
      ancestorId: null,
      ancestorName: '未匹配',
      confidence: '低',
      matchedKeywords: [],
      reason: '描述与图片文件名均未命中内置风味谱系，离线推测无法定位祖先菜品。',
      suggestion: '请补充更具体的菜名、食材或技法描述。',
    };
  }

  const dish = museumDishes.find((entry) => entry.id === best.ancestorId);
  return {
    status: '离线推测',
    ancestorId: best.ancestorId,
    ancestorName: best.name,
    confidence: bestScore >= 2 ? '中' : '低',
    matchedKeywords: bestHits,
    reason: `基于描述与图片文件名命中的关键词推断为 ${best.name}，仅作风味谱系参考，不替代文献考据。`,
    ancestor: dish
      ? {
          dynasty: dish.dynasty,
          region: dish.region,
          flavor: dish.flavor,
          technique: dish.technique,
          passage: dish.passage,
          source: dish.source,
        }
      : null,
  };
}

export const lineageClues = LINEAGE_CLUES;
