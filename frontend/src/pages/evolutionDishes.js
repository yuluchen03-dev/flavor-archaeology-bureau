const BASE_GRAPH_DISHES = [
  {
    id: 'dish_001',
    name: '蟹酿橙',
    dynasty: '宋代',
    difficulty: '中等',
    taste_profile: '鲜香酸甜，橙香蟹美',
    flavor_profile: { sour: 0.6, sweet: 0.4, bitter: 0.1, spicy: 0, salty: 0.3, umami: 0.9 },
  },
  {
    id: 'dish_002',
    name: '槐叶冷淘',
    dynasty: '唐代',
    difficulty: '简单',
    taste_profile: '清凉爽口，槐香淡雅',
    flavor_profile: { sour: 0.2, sweet: 0.3, bitter: 0.2, spicy: 0, salty: 0.2, umami: 0.4 },
  },
  {
    id: 'dish_003',
    name: '玉糁羹',
    dynasty: '宋代',
    difficulty: '简单',
    taste_profile: '清淡甘甜，质朴醇厚',
    flavor_profile: { sour: 0.1, sweet: 0.4, bitter: 0, spicy: 0, salty: 0.2, umami: 0.5 },
  },
  {
    id: 'dish_004',
    name: '王太守八宝豆腐',
    dynasty: '清代',
    difficulty: '困难',
    taste_profile: '鲜香浓郁，口感丰富',
    flavor_profile: { sour: 0.1, sweet: 0.2, bitter: 0, spicy: 0.1, salty: 0.4, umami: 0.9 },
  },
  {
    id: 'dish_005',
    name: '驼蹄羹',
    dynasty: '唐代',
    difficulty: '极难',
    taste_profile: '醇厚鲜美，胶质浓郁',
    flavor_profile: { sour: 0.1, sweet: 0.1, bitter: 0, spicy: 0.1, salty: 0.4, umami: 0.95 },
  },
  {
    id: 'dish_006',
    name: '浑羊殁忽',
    dynasty: '唐代',
    difficulty: '极难',
    taste_profile: '肥美丰腴，肉香四溢',
    flavor_profile: { sour: 0, sweet: 0.2, bitter: 0, spicy: 0.1, salty: 0.5, umami: 0.8 },
  },
  {
    id: 'dish_007',
    name: '荷包鱼',
    dynasty: '清代',
    difficulty: '困难',
    taste_profile: '鲜嫩细腻，造型雅致',
    flavor_profile: { sour: 0.1, sweet: 0.2, bitter: 0, spicy: 0, salty: 0.3, umami: 0.85 },
  },
  {
    id: 'dish_008',
    name: '荔枝腰子',
    dynasty: '宋代',
    difficulty: '中等',
    taste_profile: '酸甜脆嫩，口感独特',
    flavor_profile: { sour: 0.5, sweet: 0.4, bitter: 0, spicy: 0.1, salty: 0.3, umami: 0.6 },
  },
  {
    id: 'dish_009',
    name: '莲房鱼包',
    dynasty: '宋代',
    difficulty: '困难',
    taste_profile: '清雅鲜美，莲香鱼嫩',
    flavor_profile: { sour: 0.1, sweet: 0.3, bitter: 0.1, spicy: 0, salty: 0.2, umami: 0.7 },
  },
  {
    id: 'dish_010',
    name: '东坡肉',
    dynasty: '宋代',
    difficulty: '简单',
    taste_profile: '肥而不腻，入口即化',
    flavor_profile: { sour: 0.1, sweet: 0.3, bitter: 0, spicy: 0, salty: 0.5, umami: 0.8 },
  },
];

const EXTRA_GRAPH_DISHES = [
  {
    id: 'dish_011',
    name: '柳州螺蛳粉',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '酸辣鲜爽，螺汤浓郁',
    flavor_profile: { sour: 0.75, sweet: 0.15, bitter: 0.05, spicy: 0.75, salty: 0.55, umami: 0.85 },
  },
  {
    id: 'dish_012',
    name: '沙县小吃',
    dynasty: '地方传统',
    difficulty: '简单',
    taste_profile: '鲜香朴实，酱香柔和',
    flavor_profile: { sour: 0.12, sweet: 0.25, bitter: 0.02, spicy: 0.18, salty: 0.52, umami: 0.72 },
  },
  {
    id: 'dish_013',
    name: '缙云烧饼',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '麦香焦脆，菜干咸鲜',
    flavor_profile: { sour: 0.08, sweet: 0.22, bitter: 0.08, spicy: 0.05, salty: 0.62, umami: 0.7 },
  },
  {
    id: 'dish_014',
    name: '苗家酸汤鱼',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '酸鲜开胃，草木香清透',
    flavor_profile: { sour: 0.85, sweet: 0.12, bitter: 0.05, spicy: 0.35, salty: 0.48, umami: 0.82 },
  },
  {
    id: 'dish_015',
    name: '新疆馕',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '麦香厚实，焦香耐嚼',
    flavor_profile: { sour: 0.05, sweet: 0.25, bitter: 0.08, spicy: 0.05, salty: 0.42, umami: 0.35 },
  },
  {
    id: 'dish_016',
    name: '兰州牛肉面',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '汤清肉香，辣油明亮',
    flavor_profile: { sour: 0.08, sweet: 0.18, bitter: 0.04, spicy: 0.45, salty: 0.58, umami: 0.88 },
  },
  {
    id: 'dish_017',
    name: '桂林米粉',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '卤香浓郁，粉质爽滑',
    flavor_profile: { sour: 0.18, sweet: 0.24, bitter: 0.05, spicy: 0.25, salty: 0.65, umami: 0.82 },
  },
  {
    id: 'dish_018',
    name: '过桥米线',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '汤鲜柔润，米香清雅',
    flavor_profile: { sour: 0.06, sweet: 0.18, bitter: 0.03, spicy: 0.18, salty: 0.46, umami: 0.9 },
  },
  {
    id: 'dish_019',
    name: '镇江锅盖面',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '酱香咸鲜，面体筋道',
    flavor_profile: { sour: 0.12, sweet: 0.18, bitter: 0.03, spicy: 0.08, salty: 0.72, umami: 0.72 },
  },
  {
    id: 'dish_020',
    name: '武汉热干面',
    dynasty: '地方传统',
    difficulty: '简单',
    taste_profile: '芝麻浓香，咸鲜爽滑',
    flavor_profile: { sour: 0.16, sweet: 0.16, bitter: 0.07, spicy: 0.28, salty: 0.62, umami: 0.58 },
  },
  {
    id: 'dish_021',
    name: '驴肉火烧',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '肉香浓烈，外酥内润',
    flavor_profile: { sour: 0.04, sweet: 0.12, bitter: 0.05, spicy: 0.12, salty: 0.66, umami: 0.86 },
  },
  {
    id: 'dish_022',
    name: '周村烧饼',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '薄脆芝麻香，微甜焦香',
    flavor_profile: { sour: 0.02, sweet: 0.36, bitter: 0.08, spicy: 0.02, salty: 0.26, umami: 0.25 },
  },
  {
    id: 'dish_023',
    name: '黄桥烧饼',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '酥香分层，芝麻葱香',
    flavor_profile: { sour: 0.03, sweet: 0.28, bitter: 0.05, spicy: 0.04, salty: 0.46, umami: 0.4 },
  },
  {
    id: 'dish_024',
    name: '狗不理包子',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '肉汁鲜浓，面香微甜',
    flavor_profile: { sour: 0.03, sweet: 0.22, bitter: 0.02, spicy: 0.06, salty: 0.58, umami: 0.82 },
  },
  {
    id: 'dish_025',
    name: '德州扒鸡',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '骨酥肉烂，卤香绵长',
    flavor_profile: { sour: 0.04, sweet: 0.2, bitter: 0.06, spicy: 0.12, salty: 0.68, umami: 0.88 },
  },
  {
    id: 'dish_026',
    name: '道口烧鸡',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '香料醇厚，肉质酥润',
    flavor_profile: { sour: 0.03, sweet: 0.18, bitter: 0.06, spicy: 0.18, salty: 0.66, umami: 0.86 },
  },
  {
    id: 'dish_027',
    name: '沟帮子熏鸡',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '烟熏浓郁，咸鲜厚重',
    flavor_profile: { sour: 0.02, sweet: 0.16, bitter: 0.12, spicy: 0.1, salty: 0.7, umami: 0.82 },
  },
  {
    id: 'dish_028',
    name: '金华火腿',
    dynasty: '地方传统',
    difficulty: '极难',
    taste_profile: '咸鲜陈香，脂香悠长',
    flavor_profile: { sour: 0.08, sweet: 0.18, bitter: 0.05, spicy: 0.02, salty: 0.9, umami: 0.95 },
  },
  {
    id: 'dish_029',
    name: '宣威火腿',
    dynasty: '地方传统',
    difficulty: '极难',
    taste_profile: '腊香丰腴，咸鲜回甘',
    flavor_profile: { sour: 0.07, sweet: 0.2, bitter: 0.05, spicy: 0.03, salty: 0.88, umami: 0.93 },
  },
  {
    id: 'dish_030',
    name: '郫县豆瓣',
    dynasty: '地方传统',
    difficulty: '极难',
    taste_profile: '酱香辛辣，鲜咸浓厚',
    flavor_profile: { sour: 0.18, sweet: 0.14, bitter: 0.08, spicy: 0.82, salty: 0.82, umami: 0.9 },
  },
  {
    id: 'dish_031',
    name: '镇江香醋',
    dynasty: '地方传统',
    difficulty: '极难',
    taste_profile: '酸香柔和，陈香微甜',
    flavor_profile: { sour: 0.92, sweet: 0.28, bitter: 0.04, spicy: 0.02, salty: 0.18, umami: 0.32 },
  },
  {
    id: 'dish_032',
    name: '山西老陈醋',
    dynasty: '地方传统',
    difficulty: '极难',
    taste_profile: '酸香厚重，谷物熏香',
    flavor_profile: { sour: 0.95, sweet: 0.18, bitter: 0.08, spicy: 0.02, salty: 0.2, umami: 0.28 },
  },
  {
    id: 'dish_033',
    name: '绍兴黄酒',
    dynasty: '地方传统',
    difficulty: '极难',
    taste_profile: '醇甜微酸，米香陈厚',
    flavor_profile: { sour: 0.28, sweet: 0.52, bitter: 0.08, spicy: 0.06, salty: 0.08, umami: 0.38 },
  },
  {
    id: 'dish_034',
    name: '北京烤鸭',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '皮酥脂香，酱甜肉鲜',
    flavor_profile: { sour: 0.05, sweet: 0.34, bitter: 0.04, spicy: 0.08, salty: 0.48, umami: 0.82 },
  },
  {
    id: 'dish_035',
    name: '豆汁',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '酸酵浓烈，谷香回甘',
    flavor_profile: { sour: 0.88, sweet: 0.08, bitter: 0.18, spicy: 0.02, salty: 0.15, umami: 0.28 },
  },
  {
    id: 'dish_036',
    name: '洛阳水席',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '酸辣鲜汤，层次连绵',
    flavor_profile: { sour: 0.62, sweet: 0.14, bitter: 0.04, spicy: 0.48, salty: 0.58, umami: 0.84 },
  },
  {
    id: 'dish_037',
    name: '羊肉泡馍',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '汤浓肉香，馍粒筋润',
    flavor_profile: { sour: 0.08, sweet: 0.12, bitter: 0.05, spicy: 0.28, salty: 0.62, umami: 0.9 },
  },
  {
    id: 'dish_038',
    name: '潮州卤鹅',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '卤香清雅，鹅肉鲜韧',
    flavor_profile: { sour: 0.12, sweet: 0.2, bitter: 0.04, spicy: 0.08, salty: 0.64, umami: 0.88 },
  },
  {
    id: 'dish_039',
    name: '佛山盲公饼',
    dynasty: '地方传统',
    difficulty: '中等',
    taste_profile: '坚果甜香，薄脆耐嚼',
    flavor_profile: { sour: 0.02, sweet: 0.62, bitter: 0.05, spicy: 0.02, salty: 0.18, umami: 0.22 },
  },
  {
    id: 'dish_040',
    name: '李连贵熏肉大饼',
    dynasty: '地方传统',
    difficulty: '困难',
    taste_profile: '熏香沁脾，饼酥肉润',
    flavor_profile: { sour: 0.04, sweet: 0.14, bitter: 0.12, spicy: 0.12, salty: 0.68, umami: 0.86 },
  },
];

const GRAPH_DISHES = [...BASE_GRAPH_DISHES, ...EXTRA_GRAPH_DISHES];

const NAME_TO_GRAPH_DISH = new Map(GRAPH_DISHES.map((dish) => [dish.name, dish]));

const normalizeDynasty = (dynasty = '') => dynasty.replace('朝', '代');

const readFlavorProfile = (dish) => {
  if (dish.flavor_profile) return dish.flavor_profile;

  return {
    sour: Number(dish.flavor_sour || 0),
    sweet: Number(dish.flavor_sweet || 0),
    bitter: Number(dish.flavor_bitter || 0),
    spicy: Number(dish.flavor_spicy || 0),
    salty: Number(dish.flavor_salty || 0),
    umami: Number(dish.flavor_umami || 0),
  };
};

export const fallbackEvolutionDishes = GRAPH_DISHES;

export const normalizeEvolutionDishes = (dishes = []) => {
  const normalized = dishes
    .map((dish) => {
      const graphDish = NAME_TO_GRAPH_DISH.get(dish.name);
      if (!graphDish) return null;

      return {
        ...graphDish,
        ...dish,
        id: graphDish.id,
        dynasty: graphDish.dynasty || normalizeDynasty(dish.dynasty),
        difficulty: graphDish.difficulty || dish.difficulty || '',
        taste_profile: graphDish.taste_profile || dish.taste_profile || dish.description || '',
        flavor_profile: readFlavorProfile(dish),
      };
    })
    .filter(Boolean);

  if (normalized.length < 2) return GRAPH_DISHES;

  const seen = new Set(normalized.map((dish) => dish.id));
  const filled = [
    ...normalized,
    ...GRAPH_DISHES.filter((dish) => !seen.has(dish.id)),
  ];

  return filled;
};

export const createInitialEvolutionSelection = (dishes = GRAPH_DISHES) => {
  const first = dishes.find((dish) => dish.id === 'dish_010') || dishes[0];
  const second = dishes.find((dish) => dish.id === 'dish_001' && dish.id !== first?.id) || dishes.find((dish) => dish.id !== first?.id);

  return {
    selectedDish1: first?.id || GRAPH_DISHES[0].id,
    selectedDish2: second?.id || GRAPH_DISHES[1].id,
  };
};
