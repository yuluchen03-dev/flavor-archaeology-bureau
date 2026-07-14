// 离线博物馆规范化数据模块。
// 数据从仓库根目录 data/ 下的 JSON 内嵌导入并规范化为浏览器安全的记录。
// 所有结果均不调用外部 API，可在离线评审模式下直接使用。

import ancientRecipes from '../../../../data/recipes/ancient_recipes.json' with { type: 'json' };
import ancientFragments from '../../../../data/fragments/ancient_fragments.json' with { type: 'json' };
import evolutionRules from '../../../../data/knowledge_graph/evolution_rules.json' with { type: 'json' };
import expertManifest from '../../../../data/knowledge_graph/expert_review_manifest.json' with { type: 'json' };
import dishNodes from '../../../../data/knowledge_graph/nodes_dish.json' with { type: 'json' };
import fakeDishes from '../../../../data/light_mode/fake_dishes.json' with { type: 'json' };
import quizRealDishes from '../../../../data/light_mode/quiz_real_dishes.json' with { type: 'json' };
import dishBackgrounds from '../../../../data/visual_assets/dish_backgrounds.json' with { type: 'json' };

// 五类证据等级，离线 UI 与规则模块共享同一套常量。
export const evidenceKinds = [
  '文献明确记载',
  '跨资料推断',
  '现代转译',
  '证据不足',
  '待专家复核',
];

// 三个档案状态：仅 dish_001 为证据完整标杆；有古籍片段或专家复核清单覆盖者为推荐考据；其余待补。
const ARCHIVE_COMPLETE = '证据完整';
const ARCHIVE_RECOMMEND = '推荐考据';
const ARCHIVE_PENDING = '资料待补';

// 古代菜的归属地域（基于源文献与历史背景的确定性映射，地方菜从菜名/源文本提取）。
const REGION_BY_DISH = {
  dish_001: '江浙',
  dish_002: '中原',
  dish_003: '江浙',
  dish_004: '江浙',
  dish_005: '中原',
  dish_006: '中原',
  dish_007: '江浙',
  dish_008: '中原',
  dish_009: '江浙',
  dish_010: '江浙',
  dish_011: '广西',
  dish_012: '福建',
  dish_013: '浙江',
  dish_014: '贵州',
  dish_015: '新疆',
  dish_016: '甘肃',
  dish_017: '广西',
  dish_018: '云南',
  dish_019: '江苏',
  dish_020: '湖北',
  dish_021: '河北',
  dish_022: '山东',
  dish_023: '江苏',
  dish_024: '天津',
  dish_025: '山东',
  dish_026: '河南',
  dish_027: '辽宁',
  dish_028: '浙江',
  dish_029: '云南',
  dish_030: '四川',
  dish_031: '江苏',
  dish_032: '山西',
  dish_033: '浙江',
  dish_034: '北京',
  dish_035: '北京',
  dish_036: '河南',
  dish_037: '陕西',
  dish_038: '广东',
  dish_039: '广东',
  dish_040: '吉林',
};

// 技法关键词，按确定性顺序从原文与描述中扫描得到主技法。
const TECHNIQUE_KEYWORDS = [
  '酿', '蒸', '炙', '烤', '煮', '炒', '煨', '焙', '脍', '菹',
  '腌', '卤', '熏', '发酵', '拉', '烙', '煎', '焖', '拌', '焯', '熬',
];

function deriveTechnique(dish) {
  const text = `${dish.source_passage || ''} ${dish.description || ''} ${dish.taste_profile || ''}`;
  const hits = [];
  for (const keyword of TECHNIQUE_KEYWORDS) {
    if (text.includes(keyword) && !hits.includes(keyword)) {
      hits.push(keyword);
    }
    if (hits.length >= 3) break;
  }
  return hits.length ? hits.join('、') : '传统技艺';
}

// 建立图片路径查找表：dishId -> /dish-backgrounds/dish_xxx.png
const imageByDishId = new Map();
for (const entry of dishBackgrounds.images || []) {
  if (entry.dishId && entry.imagePath) {
    imageByDishId.set(entry.dishId, entry.imagePath);
  }
}

// 古籍片段覆盖的菜品集合（relatedDishId）。
const fragmentDishIds = new Set(
  ancientFragments.map((fragment) => fragment.relatedDishId).filter(Boolean),
);

// 专家复核清单中明确登记的菜品节点（node_type 为 dish）。
const manifestDishIds = new Set(
  (expertManifest.flagship_nodes || [])
    .filter((node) => node.node_type === 'dish')
    .map((node) => node.node_id),
);

function resolveArchiveState(dishId) {
  // dish_001 是唯一证据完整的标杆：源文、片段、食材、技法、朝代、recorded_in 关系齐全。
  if (dishId === 'dish_001') {
    return ARCHIVE_COMPLETE;
  }
  // 有古籍片段或专家复核清单覆盖，则进入推荐考据。
  if (fragmentDishIds.has(dishId) || manifestDishIds.has(dishId)) {
    return ARCHIVE_RECOMMEND;
  }
  return ARCHIVE_PENDING;
}

// 规范化单条菜品记录：只保留 UI 使用的字段。
function normalizeDish(dish) {
  const image = imageByDishId.get(dish.id) || `/dish-backgrounds/${dish.id}.png`;
  return {
    id: dish.id,
    name: dish.name,
    dynasty: dish.dynasty,
    region: REGION_BY_DISH[dish.id] || '待考',
    image,
    archiveState: resolveArchiveState(dish.id),
    flavor: dish.taste_profile || '',
    technique: deriveTechnique(dish),
    passage: dish.source_passage || '',
    source: dish.source_text || '',
    difficulty: dish.difficulty || '',
    description: dish.description || '',
    flavorProfile: dish.flavor_profile || null,
  };
}

// 强制输出 40 道，id 从 dish_001 到 dish_040，顺序固定。
const dishNodeById = new Map(dishNodes.map((node) => [node.id, node]));
export const museumDishes = Array.from({ length: 40 }, (_, index) => {
  const id = `dish_${String(index + 1).padStart(3, '0')}`;
  const node = dishNodeById.get(id);
  if (!node) {
    throw new Error(`Missing dish node for ${id}`);
  }
  return normalizeDish(node);
});

// 蟹酿橙证据：三个固定热点，对应橙壳、蟹馅与蒸制结构。
// 引文为面向展项的精炼表述，来源指向《山家清供》。
export const crabOrangeEvidence = {
  dishId: 'dish_001',
  title: '蟹酿橙 · 证据热点',
  source: '《山家清供》卷下',
  hotspots: [
    {
      id: 'hotspot_shell',
      label: '橙壳',
      quote: '以橙为器',
      source: '《山家清供》卷下',
      kind: '文献明确记载',
      confidence: '高',
      explanation: '黄熟大橙截顶去瓤后留少液作器，原文明确以橙壳作为容器，是复原形态的根基。',
    },
    {
      id: 'hotspot_filling',
      label: '蟹馅',
      quote: '以蟹膏肉实其内',
      source: '《山家清供》卷下',
      kind: '文献明确记载',
      confidence: '高',
      explanation: '蟹膏与蟹肉混合填入橙壳，原料与填法均有原文支撑，风味与结构得以确定。',
    },
    {
      id: 'hotspot_steam',
      label: '蒸制结构',
      quote: '覆橙顶，入甑蒸熟',
      source: '《山家清供》卷下',
      kind: '跨资料推断',
      confidence: '中',
      explanation: '原文"仍以带枝顶覆之，入小甑，用酒、醋、水蒸熟"被凝练为覆顶入甑的蒸制结构，跨步骤推断需专家复核火候。',
    },
  ],
};

// 导师问答：离线模式下对常见考据问题的确定性提示。
export const mentorAnswers = {
  蟹酿橙: {
    question: '蟹酿橙的复原依据是什么？',
    answer: '《山家清供》卷下原文记载了橙壳为器、蟹膏肉填馅、覆顶入甑蒸制的完整链条，是当前唯一证据完整的标杆菜。',
    source: '《山家清供》卷下',
  },
  复原方法: {
    question: '弱线索能不能直接复原蟹酿橙？',
    answer: '不能。线索不足时返回"证据不足"，需要补充古籍原文或口述来源、大致朝代地域、可验证的食材或技法三类证据。',
    source: '离线规则',
  },
  进化推演: {
    question: '菜品融合结果是 AI 生成的吗？',
    answer: '不是。离线模式下所有融合结果均标注为"离线规则推演"，优先采用明确的进化规则，否则用确定性回退。',
    source: '离线规则',
  },
  祖先匹配: {
    question: '图片匹配到的祖先是确凿结论吗？',
    answer: '不是。图片与描述匹配始终标注为"离线推测"，仅作风味谱系参考，不替代文献考据。',
    source: '离线规则',
  },
};

// 真假非遗题库：real 为真实非遗菜品，fake 为伪传统反例。
const dishNameById = new Map(dishNodes.map((node) => [node.id, node.name]));
const dishDynastyById = new Map(dishNodes.map((node) => [node.id, node.dynasty]));

export const quizData = {
  real: quizRealDishes.map((entry) => ({
    dishId: entry.dishId,
    name: dishNameById.get(entry.dishId) || '',
    dynasty: dishDynastyById.get(entry.dishId) || '',
    difficulty: entry.difficulty,
    isReal: true,
  })),
  fake: fakeDishes.map((entry) => ({
    id: entry.id,
    name: entry.name,
    dynasty: entry.dynasty,
    description: entry.description,
    tell: entry.tell,
    source: entry.source,
    difficulty: entry.difficulty,
    isReal: false,
  })),
};

// 博物馆合作方案：互动展项、周期、设备形态、交付内容与评估指标。
export const museumOffer = {
  title: '博物馆互动展项',
  summary: '面向文博场馆的离线风味考古互动展，以蟹酿橙证据热点为核心，串联 40 道馆藏菜品与非遗技法。',
  timeline: '2–4 周',
  devices: [
    { name: '触摸屏', purpose: '单菜品证据热点点选与考据问答' },
    { name: '大屏', purpose: '风味星图与每日复原菜品轮播' },
    { name: '展台', purpose: '实物道具与复原证书打印体验' },
  ],
  deliverables: {
    label: '交付内容',
    items: [
      '离线单文件互动展应用（无需联网）',
      '40 道馆藏菜品规范化数据与证据标注',
      '蟹酿橙三热点证据解说脚本',
      '每日复原与融合推演确定性规则包',
      '研学任务卡与复原证书 SVG 模板',
    ],
  },
  metrics: {
    label: '评估指标',
    items: {
      体验完成率: '完成至少一次证据热点点选与考据问答的访客占比',
      平均停留时间: '单次展项交互的平均停留时长',
      证据热点点击率: '三个蟹酿橙证据热点的点选覆盖率',
      研学任务完成率: '研学任务卡中复原与匹配任务的完成比例',
    },
  },
};

// 暴露原始规则数据供融合引擎复用（保持单一数据源）。
export const offlineEvolutionRules = evolutionRules;
export const offlineAncientRecipes = ancientRecipes;
export const offlineAncientFragments = ancientFragments;
