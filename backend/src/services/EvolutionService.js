const PythonBridge = require('./PythonBridge');
const DishVisualPromptService = require('./DishVisualPromptService');

function buildCertificateId(seed) {
  const normalized = String(seed || Date.now()).replace(/[^0-9A-Za-z]/g, '');
  const suffix = normalized.slice(-8).padStart(8, '0').toUpperCase();
  return `FAB-EVO-${suffix}`;
}

const CURATED_FUSION_NAMES = new Map([
  ['东坡肉|槐叶冷淘', '槐香东坡'],
  ['东坡肉|玉糁羹', '玉糁东坡'],
  ['东坡肉|王太守八宝豆腐', '八珍东坡'],
  ['东坡肉|莲房鱼包', '莲房东坡'],
  ['东坡肉|荷包鱼', '东坡荷鱼'],
  ['东坡肉|荔枝腰子', '荔香东坡'],
  ['东坡肉|蟹酿橙', '橙蟹东坡'],
  ['东坡肉|浑羊殁忽', '东坡浑羊'],
  ['东坡肉|驼蹄羹', '东坡驼羹'],
  ['槐叶冷淘|玉糁羹', '碧槐玉糁'],
  ['槐叶冷淘|王太守八宝豆腐', '槐香八珍'],
  ['槐叶冷淘|莲房鱼包', '槐叶莲鱼'],
  ['槐叶冷淘|荷包鱼', '槐香荷鱼'],
  ['槐叶冷淘|荔枝腰子', '槐荔玉腰'],
  ['槐叶冷淘|蟹酿橙', '槐香橙蟹'],
  ['槐叶冷淘|浑羊殁忽', '槐风浑羊'],
  ['槐叶冷淘|驼蹄羹', '槐风驼羹'],
  ['玉糁羹|王太守八宝豆腐', '玉糁八珍'],
  ['玉糁羹|莲房鱼包', '莲房玉糁'],
  ['玉糁羹|荷包鱼', '玉糁荷鱼'],
  ['玉糁羹|荔枝腰子', '玉糁荔腰'],
  ['玉糁羹|蟹酿橙', '玉糁橙蟹'],
  ['玉糁羹|浑羊殁忽', '玉糁羊羹'],
  ['玉糁羹|驼蹄羹', '玉糁驼羹'],
  ['王太守八宝豆腐|莲房鱼包', '莲房八珍'],
  ['王太守八宝豆腐|荷包鱼', '八珍荷鱼'],
  ['王太守八宝豆腐|荔枝腰子', '荔腰八珍'],
  ['王太守八宝豆腐|蟹酿橙', '橙蟹八珍'],
  ['王太守八宝豆腐|浑羊殁忽', '八珍浑羊'],
  ['王太守八宝豆腐|驼蹄羹', '八珍驼羹'],
  ['莲房鱼包|荷包鱼', '荷莲鱼包'],
  ['莲房鱼包|荔枝腰子', '荔香莲鱼'],
  ['莲房鱼包|蟹酿橙', '莲房橙蟹'],
  ['莲房鱼包|浑羊殁忽', '莲房浑羊'],
  ['莲房鱼包|驼蹄羹', '莲房驼羹'],
  ['荷包鱼|荔枝腰子', '荔香荷鱼'],
  ['荷包鱼|蟹酿橙', '荷鱼橙蟹'],
  ['荷包鱼|浑羊殁忽', '荷鱼浑羊'],
  ['荷包鱼|驼蹄羹', '驼羹荷鱼'],
  ['荔枝腰子|蟹酿橙', '荔橙蟹腰'],
  ['荔枝腰子|浑羊殁忽', '荔腰浑羊'],
  ['荔枝腰子|驼蹄羹', '荔腰驼羹'],
  ['蟹酿橙|浑羊殁忽', '橙蟹羊脯'],
  ['蟹酿橙|驼蹄羹', '橙蟹驼羹'],
  ['浑羊殁忽|驼蹄羹', '驼蹄浑羊'],
]);

const DISH_NAME_ANCHORS = new Map([
  ['蟹酿橙', '橙蟹'],
  ['槐叶冷淘', '碧槐'],
  ['玉糁羹', '玉糁'],
  ['王太守八宝豆腐', '八珍'],
  ['驼蹄羹', '驼羹'],
  ['浑羊殁忽', '浑羊'],
  ['荷包鱼', '荷鱼'],
  ['荔枝腰子', '荔腰'],
  ['莲房鱼包', '莲房'],
  ['东坡肉', '东坡'],
]);

function pairKey(sourceNames) {
  return sourceNames.filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')).join('|');
}

function fallbackAnchor(name) {
  return String(name || '')
    .replace(/[菜品料理羹汤肉鱼包豆腐冷淘融合新式古法]/g, '')
    .slice(0, 2) || '风味';
}

function isMechanicalFusionName(name, sourceNames) {
  const value = String(name || '').trim();
  if (!value) return true;
  if (value.length > 6) return true;
  if (/[xX×]/.test(value) || value.includes('融合') || value.includes('拼')) return true;
  return sourceNames.some((first) => (
    sourceNames.some((second) => first !== second && (
      value === `${first}${second}`
      || value === `${second}${first}`
      || (value.includes(first) && value.includes(second))
    ))
  ));
}

function buildFusionDishName(sourceDishes = [], proposedName = '') {
  const sourceNames = sourceDishes.map((dish) => dish.name).filter(Boolean);
  const curatedName = CURATED_FUSION_NAMES.get(pairKey(sourceNames));
  if (curatedName) return curatedName;

  const trimmedProposal = String(proposedName || '').trim();
  if (!isMechanicalFusionName(trimmedProposal, sourceNames)) return trimmedProposal;

  const anchors = sourceNames.map((name) => DISH_NAME_ANCHORS.get(name) || fallbackAnchor(name));
  return anchors.join('').slice(0, 6) || '风味新馔';
}

function buildShareCard(newDish, sourceDishes) {
  const dishName = newDish.name || '风味新菜';
  const dynasty = newDish.dynasty || '跨时空融合';
  const certificateId = buildCertificateId(`${dishName}-${sourceDishes.map((dish) => dish.id).join('-')}`);
  const confidence = newDish.confidence || 82;
  const badges = [dynasty, '新物种', `${confidence}%血统约束生成`];

  return {
    type: 'evolution',
    title: `风味进化证书 · ${dishName}`,
    subtitle: '真实古菜血统约束下的新菜生成',
    dishName,
    dynasty,
    rarity: '新物种',
    confidence,
    signature: '首席风味考古官',
    certificateId,
    badges,
    sourceDishes: sourceDishes.map((dish) => dish.name),
    shareText: `风味进化证书 · ${dishName}｜${dynasty}｜${sourceDishes.map((dish) => dish.name).join(' × ')}｜${certificateId}`,
    footer: '风味考古局 · 复活过去，孕育未来',
  };
}

function buildImagePrompt(newDish, sourceDishes, fusionConcept = '') {
  const dishName = newDish.name || '风味融合菜';
  const sourceNames = sourceDishes.map((dish) => dish.name).filter(Boolean);
  const sourceText = sourceNames.length > 0 ? sourceNames.join('、') : '两道历史菜品';
  const techniques = Array.isArray(newDish.techniques) ? newDish.techniques.join('、') : '';
  const description = newDish.description || fusionConcept || '';
  const sourceFacts = sourceNames.map((name) => DishVisualPromptService.buildSourceFacts(name));

  const specialGuidance = sourceNames.includes('东坡肉') && sourceNames.includes('蟹酿橙')
    ? '设计成橙香蟹粉芡汁浇在酱红方块东坡肉上，或用小橙盏盛蟹粉酱作为点睛配搭；蟹肉和蟹黄应融入酱汁，不要出现整只螃蟹，不要出现蟹腿围盘，不要把橙子只当切片装饰。'
    : '把来源菜的风味、酱汁、盛器或关键食材融为一体，形成统一主菜结构。';

  return [
    `${dishName}，一道完整可食用的融合菜，一盘单一成品菜。`,
    `来源灵感：${sourceText}。`,
    description ? `菜品设定：${description}` : '',
    techniques ? `烹饪技法：${techniques}。` : '',
    sourceFacts.length > 0 ? `来源菜视觉事实：${sourceFacts.join(' ')}` : '',
    '融合原则：只提取风味、技法和食材线索，不复制两道原菜的外形，不做双拼盘。',
    '成品形态：所有食材都必须呈现为熟制、切配、调味后的可入口状态，主料、酱汁、配菜和器皿服务于同一个菜品构图。',
    specialGuidance,
    '画面必须像真实餐厅出品的中式菜品摄影：主菜清楚，酱汁自然，摆盘克制，餐具真实，暖色自然光。',
    '不要把两个原菜简单并排，不要拼贴，不要概念海报，不要文字，不要卡通，不要畸形食材。',
  ].filter(Boolean).join(' ');
}

class EvolutionService {
  static async evolve({ dishId1, dishId2 }) {
    if (!dishId1 || !dishId2) {
      throw new Error('需要提供两个菜品ID');
    }

    const result = await PythonBridge.evolution(dishId1, dishId2);
    const newDish = result.new_dish || {};
    const sourceDishes = result.source_dishes || [];
    const renamedDish = {
      ...newDish,
      name: buildFusionDishName(sourceDishes, newDish.name),
    };

    return {
      newDish: renamedDish,
      sourceDishes,
      fusionConcept: result.fusion_concept || renamedDish.description || '',
      imagePrompt: buildImagePrompt(renamedDish, sourceDishes, result.fusion_concept),
      shareCard: buildShareCard(renamedDish, sourceDishes),
      llmEnhanced: Boolean(result.llm_enhanced),
    };
  }
}

EvolutionService.buildImagePrompt = buildImagePrompt;
EvolutionService.buildFusionDishName = buildFusionDishName;

module.exports = EvolutionService;
