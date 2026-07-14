const path = require('path');

const dishes = require(path.join(__dirname, '../../../data/knowledge_graph/nodes_dish.json'));
const expandedFakeDishBank = require(path.join(__dirname, '../../../data/light_mode/fake_dishes.json'));
const realQuizBank = require(path.join(__dirname, '../../../data/light_mode/quiz_real_dishes.json'));
const CollectionService = require('./CollectionService');
const DigitalHumanService = require('./DigitalHumanService');
const ShareIntentService = require('./ShareIntentService');
const VisionService = require('./VisionService');
const VoiceService = require('./VoiceService');

const rarityByDifficulty = {
  简单: '稀有',
  中等: '濒危',
  困难: '灭绝',
  极难: '传说',
};

const ancestorMappings = [
  {
    keywords: ['蟹', '橙', '蟹粉', '蟹黄', '蟹肉'],
    dishId: 'dish_001',
    hook: '你的这口鲜味，祖上很可能住在一只宋代黄橙里。',
  },
  {
    keywords: ['面', '凉面', '冷面', '拌面', '槐叶'],
    dishId: 'dish_002',
    hook: '这碗面有唐人避暑的影子，清凉一脉能追到槐叶冷淘。',
  },
  {
    keywords: ['萝卜', '羹', '粥', '米糁'],
    dishId: 'dish_003',
    hook: '朴素到极致的白味，和东坡的玉糁羹很投缘。',
  },
  {
    keywords: ['豆腐', '蘑菇', '菌', '松子'],
    dishId: 'dish_004',
    hook: '豆腐一旦认真起来，清代官府菜都要点头。',
  },
  {
    keywords: ['羊', '烤肉', '肉夹馍', '羊肉'],
    dishId: 'dish_006',
    hook: '这股肉香往深处走，会碰到盛唐宴席里的巨制。',
  },
  {
    keywords: ['鱼', '鲫鱼', '鱼丸', '鱼肉'],
    dishId: 'dish_007',
    hook: '鱼肉被做成玲珑形制，祖谱里少不了清代荷包鱼。',
  },
];

const fakeDishBank = [
  {
    id: 'fake_001',
    name: '云母月光羹',
    dynasty: '宋代',
    description: '号称以云母粉入羹、月下凝露成冻，名字很雅，但缺少可靠食方出处。',
    source_text: '饕餮现场造梗',
  },
  {
    id: 'fake_002',
    name: '凤凰琉璃脍',
    dynasty: '唐代',
    description: '听上去像烧尾宴名物，实则混用了后世审美元素，没有稳定古籍证据。',
    source_text: 'AI 幻觉样本',
  },
];

function getDishById(id) {
  return dishes.find((dish) => dish.id === id) || dishes[0];
}

function parseExcludedDishIds(value) {
  if (Array.isArray(value)) {
    return new Set(value.filter(Boolean));
  }

  return new Set(String(value || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean));
}

function pickDailyDish(drawSeed, excludeDishId) {
  const firstIndex = Math.abs(drawSeed) % dishes.length;
  const excludedIds = parseExcludedDishIds(excludeDishId);

  for (let offset = 0; offset < dishes.length; offset += 1) {
    const candidate = dishes[(firstIndex + offset) % dishes.length];
    if (!excludedIds.has(candidate.id)) {
      return candidate;
    }
  }

  return dishes[firstIndex];
}

function buildCertificateId(prefix, seed) {
  const normalized = String(seed || Date.now()).replace(/[^0-9A-Za-z]/g, '');
  const suffix = normalized.slice(-8).padStart(8, '0').toUpperCase();
  return `FAB-${prefix}-${suffix}`;
}

function getRarity(dish) {
  if (dish.id === 'dish_001') return '灭绝';
  return rarityByDifficulty[dish.difficulty] || '稀有';
}

function buildCollection(dish, status) {
  return {
    status,
    starId: `star-${dish.id}`,
    constellation: `${dish.dynasty || '未知'}风味星座`,
    litAt: new Date().toISOString(),
  };
}

function buildShareCard({
  title,
  subtitle,
  dish,
  rarity,
  confidence,
  type,
  signature = '首席风味考古官',
}) {
  const certificateId = buildCertificateId(type.toUpperCase().slice(0, 3), `${dish.id}-${title}`);
  const badges = [dish.dynasty, rarity, `${confidence}%可信复原`].filter(Boolean);

  const card = {
    type,
    title,
    subtitle,
    dishName: dish.name,
    dynasty: dish.dynasty,
    rarity,
    confidence,
    signature,
    certificateId,
    badges,
    shareText: `${title}｜${dish.dynasty}｜${rarity}｜${confidence}%可信复原｜${certificateId}`,
    footer: '风味考古局 · 让灭绝的中国味道重新复生',
  };

  return {
    ...card,
    platformIntents: ShareIntentService.buildPlatformIntents(card),
  };
}

class LightModeService {
  static async recognizeAncestor({ description = '', imageLabel = '', imageData = '', userId } = {}) {
    const clue = `${description} ${imageLabel}`.trim();
    const vision = await VisionService.analyzeFoodImage({ imageData, imageLabel, description });
    const bestVisionCandidate = vision.dishCandidates?.[0];
    const textMatch = ancestorMappings.find((mapping) =>
      mapping.keywords.some((keyword) => clue.includes(keyword))
    );
    const matched = (bestVisionCandidate
      ? ancestorMappings.find((mapping) => mapping.dishId === bestVisionCandidate.dishId)
      : textMatch) || textMatch || ancestorMappings[0];
    const ancestor = getDishById(matched.dishId);
    const rarity = getRarity(ancestor);
    const confidence = bestVisionCandidate?.dishId === matched.dishId
      ? Math.round(bestVisionCandidate.confidence * 100)
      : matched.dishId === 'dish_001' ? 88 : 76;
    const ancestorResult = { ancestor, rarity, confidence, vision };
    const digitalHuman = DigitalHumanService.buildAncestorNarration({ ancestorResult });
    const voice = VoiceService.buildVoiceCue({
      script: digitalHuman.script,
      speaker: digitalHuman.speaker,
      emotion: digitalHuman.emotion,
    });
    const collection = await CollectionService.recordCollectionEntry({
      userId,
      dish: { ...ancestor, rarity },
      source: 'ancestor',
    });

    return {
      mode: 'ancestor',
      input: {
        description,
        imageLabel,
        imageDataProvided: Boolean(imageData),
      },
      vision,
      ancestor,
      rarity,
      confidence,
      digitalHuman,
      voice,
      collection,
      story: `${matched.hook}《${ancestor.name}》见于${ancestor.source_text}：${ancestor.description}`,
      taotieComment: clue
        ? `饕餮嗅了嗅：这不是普通午饭，这是${ancestor.dynasty}风味的后代。`
        : `饕餮拍案：没给图也能先认个祖，默认从铁打样本《${ancestor.name}》开局。`,
      shareCard: buildShareCard({
        type: 'ancestor',
        title: `我这口饭的祖宗是${ancestor.name}`,
        subtitle: '拍照认祖归宗',
        dish: ancestor,
        rarity,
        confidence,
      }),
    };
  }

  static async getDailyRevival({
    date = new Date().toISOString().slice(0, 10),
    seed,
    excludeDishId,
    draw = false,
    userId,
  } = {}) {
    const drawSeed = Number(seed) || Number(date.replace(/\D/g, '')) || 1;
    const dish = pickDailyDish(drawSeed, excludeDishId);
    const rarity = getRarity(dish);
    const confidence = dish.id === 'dish_001' ? 90 : 72 + (drawSeed % 18);
    const economy = await CollectionService.recordDailyRevival({
      userId,
      dish: { ...dish, rarity },
      date,
      consumeDraw: draw,
    });

    return {
      mode: 'daily',
      date,
      dish,
      rarity,
      confidence,
      draws: economy.draws,
      collection: economy.collection,
      prompt: `今日复活：${dish.dynasty}《${dish.name}》`,
      unlockText: `${dish.name}已点亮味觉星图。${dish.taste_profile || dish.description}`,
      shareCard: buildShareCard({
        type: 'daily',
        title: `今日复活 · ${dish.name}`,
        subtitle: '每日抽卡',
        dish,
        rarity,
        confidence,
      }),
    };
  }

  static async getAuthenticityRound({ seed = Date.now(), dynasty, difficulty } = {}) {
    const numericSeed = Number(seed) || Date.now();
    const filteredRealRefs = realQuizBank.filter((entry) => {
      const dish = getDishById(entry.dishId);
      return (!difficulty || entry.difficulty === difficulty) && (!dynasty || dish.dynasty === dynasty);
    });
    const filteredFakes = expandedFakeDishBank.filter((entry) =>
      (!difficulty || entry.difficulty === difficulty) && (!dynasty || entry.dynasty === dynasty)
    );
    const realRefs = filteredRealRefs.length ? filteredRealRefs : realQuizBank;
    const fakes = filteredFakes.length ? filteredFakes : expandedFakeDishBank;
    const realRef = realRefs[numericSeed % realRefs.length];
    const realDish = getDishById(realRef.dishId);
    const fakeDish = fakes[numericSeed % fakes.length];
    const realFirst = numericSeed % 2 === 0;
    const options = [
      {
        id: realDish.id,
        name: realDish.name,
        dynasty: realDish.dynasty,
        description: realDish.description,
        source: realDish.source_text,
        isReal: true,
      },
      {
        id: fakeDish.id,
        name: fakeDish.name,
        dynasty: fakeDish.dynasty,
        description: fakeDish.description,
        source: fakeDish.source,
        isReal: false,
      },
    ];
    const orderedOptions = realFirst ? options : options.reverse();

    return {
      mode: 'authenticity',
      question: '哪一道是真正有古籍/食单线索支撑的非遗风味？',
      options: orderedOptions,
      answerId: realDish.id,
      difficulty: difficulty || realRef.difficulty || fakeDish.difficulty,
      fakeTell: fakeDish.tell,
      explanation: `真菜是《${realDish.name}》，线索来自${realDish.source_text}。另一道是饕餮故意编出的幻觉样本：${fakeDish.tell}`,
      shareCard: buildShareCard({
        type: 'quiz',
        title: `真假非遗 · 我识破了${fakeDish.name}`,
        subtitle: '把 AI 幻觉变成科普游戏',
        dish: realDish,
        rarity: getRarity(realDish),
        confidence: 86,
      }),
    };
  }

  static async createShareCard({
    dishId = 'dish_001',
    type = 'revival',
    signature = '首席风味考古官',
  } = {}) {
    const dish = getDishById(dishId);
    const rarity = getRarity(dish);
    const confidence = dish.id === 'dish_001' ? 90 : 82;
    const titleByType = {
      revival: `风味复活证书 · ${dish.name}`,
      ancestor: `认祖归宗证书 · ${dish.name}`,
      evolution: `风味进化证书 · ${dish.name}`,
      quiz: `真假非遗证书 · ${dish.name}`,
      daily: `今日复活 · ${dish.name}`,
    };

    return buildShareCard({
      type,
      title: titleByType[type] || `风味证书 · ${dish.name}`,
      subtitle: '一键分享',
      dish,
      rarity,
      confidence,
      signature,
    });
  }
}

module.exports = LightModeService;
