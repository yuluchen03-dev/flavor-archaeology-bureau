const path = require('path');

const dishes = require(path.join(__dirname, '../../../../data/knowledge_graph/nodes_dish.json'));

function normalize(value = '') {
  return String(value).trim().toLowerCase();
}

const dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
const dishesByName = new Map(dishes.map((dish) => [normalize(dish.name), dish]));

const keywordRules = [
  {
    dishId: 'dish_001',
    keywords: ['crab', 'orange', 'steamed', '蟹', '橙', '蒸'],
  },
  {
    dishId: 'dish_002',
    keywords: ['noodle', 'cold noodle', 'leaf', '槐叶', '冷淘', '面'],
  },
  {
    dishId: 'dish_003',
    keywords: ['radish', 'rice', 'porridge', '萝卜', '米', '羹'],
  },
  {
    dishId: 'dish_004',
    keywords: ['tofu', 'mushroom', '豆腐', '蘑菇', '菇'],
  },
  {
    dishId: 'dish_006',
    keywords: ['lamb', 'roast', 'meat', '羊', '烤肉', '肉'],
  },
  {
    dishId: 'dish_007',
    keywords: ['fish', '鱼', '鲜鱼'],
  },
];

function textFrom(value) {
  if (Array.isArray(value)) return value.join(' ');
  return value || '';
}

function searchableTextFor(candidate) {
  return normalize(
    [candidate.name, candidate.reason, textFrom(candidate.labels), textFrom(candidate.ingredients)].join(' ')
  );
}

function dishByKeyword(candidate) {
  const searchableText = searchableTextFor(candidate);
  const rule = keywordRules.find((item) =>
    item.keywords.some((keyword) => searchableText.includes(normalize(keyword)))
  );

  return rule ? dishesById.get(rule.dishId) : null;
}

class VisionCandidateMapper {
  static mapCandidates(candidates = []) {
    if (!Array.isArray(candidates)) return [];

    return candidates
      .map((candidate) => {
        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;

        const dish = dishesById.get(candidate.dishId) || dishesByName.get(normalize(candidate.name)) || dishByKeyword(candidate);
        if (!dish) return null;

        return {
          dishId: dish.id,
          name: dish.name,
          confidence: Number(candidate.confidence) || 0.5,
          reason: candidate.reason || `Mapped provider candidate to ${dish.name}.`,
        };
      })
      .filter(Boolean);
  }
}

module.exports = VisionCandidateMapper;
