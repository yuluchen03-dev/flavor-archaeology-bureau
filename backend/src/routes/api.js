const express = require('express');
const router = express.Router();
const { execFile } = require('child_process');
const path = require('path');
const PythonBridge = require('../services/PythonBridge');
const LightModeService = require('../services/LightModeService');
const AgnesImageService = require('../services/AgnesImageService');
const DishVisualPromptService = require('../services/DishVisualPromptService');
const AiRunMetadata = require('../services/AiRunMetadata');

const PYTHON_SCRIPT = path.join(__dirname, '../../../../service/api_wrapper.py');
const PYTHON_BIN = () => process.env.PYTHON_BIN || 'python';

function generatePlaceholderSVG(dishName) {
  const safeName = dishName || '菜品';
  const color = '#8C3B2E';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <rect width="400" height="300" fill="#F5F0EB" rx="12"/>
  <rect x="100" y="80" width="200" height="140" rx="20" fill="${color}" opacity="0.15"/>
  <circle cx="200" cy="150" r="45" fill="${color}" opacity="0.2"/>
  <text x="200" y="250" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="24" fill="${color}" font-weight="bold">${safeName}</text>
  <text x="200" y="275" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="14" fill="#9C6B2E">AI风味复原 · 成品图</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function buildDegradedImagePayload({
  dishName,
  fallbackPrompt,
  fallbackReason,
  provider = 'agnes',
  model = process.env.AGNES_IMAGE_MODEL || 'agnes-image-2.0-flash',
  configured = false,
  startedAt = Date.now(),
} = {}) {
  const reason = fallbackReason || 'Image provider unavailable; local placeholder returned.';
  return {
    imageUrl: generatePlaceholderSVG(dishName),
    type: 'placeholder',
    status: 'degraded',
    fallbackReason: reason,
    prompt: fallbackPrompt,
    metadata: AiRunMetadata.degraded({
      provider,
      model,
      startedAt,
      fallbackReason: reason,
      configured,
    }),
  };
}

function attachLocalImageMetadata(result, startedAt = Date.now()) {
  if (!result || typeof result !== 'object') return result;
  if (result.metadata) return result;

  const isGenerated = result.type === 'ai_generated' || result.type === 'generated';
  return {
    ...result,
    status: isGenerated ? 'generated' : 'degraded',
    metadata: isGenerated
      ? AiRunMetadata.generated({ provider: 'local-python', model: 'image-generator', startedAt })
      : AiRunMetadata.degraded({
          provider: 'local-python',
          model: 'placeholder-svg',
          startedAt,
          fallbackReason: result.fallbackReason || 'Local image generator returned a placeholder.',
          configured: true,
        }),
  };
}

function normalizeIngredients(ingredients = []) {
  if (!Array.isArray(ingredients)) {
    return {
      original: ingredients.original || [],
      modern: ingredients.modern || ingredients.original || [],
    };
  }

  return {
    original: ingredients.map((item) => item.name || item).filter(Boolean),
    modern: ingredients.map((item) => {
      if (item.substitutes && item.substitutes.length > 0) {
        return item.substitutes[0].name;
      }
      return item.name || item;
    }).filter(Boolean),
  };
}

function clampEvidenceScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function calculateEvidenceScore(breakdown) {
  return clampEvidenceScore(
    breakdown.clueMatch * 0.3
    + breakdown.sourceMatch * 0.3
    + breakdown.ingredientMatch * 0.2
    + breakdown.techniqueMatch * 0.2
  );
}

function normalizeEvidenceBreakdown(breakdown, fallback) {
  if (!breakdown || typeof breakdown !== 'object') return fallback;
  return {
    clueMatch: clampEvidenceScore(breakdown.clueMatch ?? breakdown.clue_match ?? fallback.clueMatch),
    sourceMatch: clampEvidenceScore(breakdown.sourceMatch ?? breakdown.source_match ?? fallback.sourceMatch),
    ingredientMatch: clampEvidenceScore(breakdown.ingredientMatch ?? breakdown.ingredient_match ?? fallback.ingredientMatch),
    techniqueMatch: clampEvidenceScore(breakdown.techniqueMatch ?? breakdown.technique_match ?? fallback.techniqueMatch),
    overallReason: breakdown.overallReason || breakdown.overall_reason || fallback.overallReason,
  };
}

function buildEvidencePayload(restoration = {}, formattedDish = {}) {
  const citations = Array.isArray(restoration.citations) ? restoration.citations : [];
  const ingredients = formattedDish.ingredients?.original || [];
  const techniques = formattedDish.techniques || restoration.techniques || [];
  const steps = formattedDish.cookingSteps || restoration.steps || [];
  const fallback = {
    clueMatch: clampEvidenceScore((restoration.match_confidence || 0.85) * 100),
    sourceMatch: citations.length > 0
      ? 100
      : clampEvidenceScore(restoration.source_url || restoration.sourceUrl || restoration.source || restoration.original_text ? 75 : 0),
    ingredientMatch: clampEvidenceScore(ingredients.length > 0 ? 80 : 0),
    techniqueMatch: clampEvidenceScore((techniques.length > 0 || steps.length > 0) ? 80 : 0),
    overallReason: 'Evidence combines matched clues, source citations, ingredients, and cooking techniques.',
  };
  const evidenceBreakdown = normalizeEvidenceBreakdown(
    restoration.evidenceBreakdown || restoration.evidence_breakdown,
    fallback
  );
  const score = restoration.evidenceScore ?? restoration.evidence_score;
  return {
    evidenceScore: score === undefined || score === null
      ? calculateEvidenceScore(evidenceBreakdown)
      : clampEvidenceScore(score),
    evidenceBreakdown,
  };
}

function buildInsufficientEvidencePayload(reason) {
  return {
    evidenceScore: 0,
    evidenceBreakdown: {
      clueMatch: 0,
      sourceMatch: 0,
      ingredientMatch: 0,
      techniqueMatch: 0,
      overallReason: reason || 'Insufficient evidence to produce a reliable restoration.',
    },
  };
}

const DISH_ID_TO_NAME = {
  dish_001: '蟹酿橙',
  dish_002: '槐叶冷淘',
  dish_003: '玉糁羹',
  dish_004: '王太守八宝豆腐',
  dish_005: '驼蹄羹',
  dish_006: '浑羊殁忽',
  dish_007: '荷包鱼',
  dish_008: '荔枝腰子',
  dish_009: '莲房鱼包',
  dish_010: '东坡肉',
  dish_011: '炙羊肉',
  recipe_001: '蟹酿橙',
  recipe_002: '槐叶冷淘',
  recipe_003: '玉糁羹',
  recipe_004: '王太守八宝豆腐',
  recipe_005: '炙羊肉',
};

function resolveImageDishName(rawDishName, rawPrompt, req, rawDishId) {
  const dishId = String(rawDishId || '').trim();
  if (DISH_ID_TO_NAME[dishId]) return DISH_ID_TO_NAME[dishId];

  const candidates = [
    rawDishName,
    rawPrompt,
    req?.originalUrl,
    req?.url,
  ].filter(Boolean).map((value) => String(value));

  const knownDishNames = Object.keys(DishVisualPromptService.SPECS || {});
  for (const name of knownDishNames) {
    if (candidates.some((value) => value.includes(name) || value.includes(encodeURIComponent(name)))) {
      return name;
    }
  }

  return rawDishName;
}

function inferDishId(restoration, dishes) {
  if (restoration.id && String(restoration.id).startsWith('dish_')) return restoration.id;
  if (restoration.dish_id) return restoration.dish_id;

  const dishName = restoration.dish_name || restoration.name;
  const matched = dishes.find((dish) => dish.name === dishName);
  return matched?.id || dishes[0]?.id || 'dish_001';
}

function formatRestoredDish(restoration, clue, dishes) {
  const ingredients = normalizeIngredients(restoration.ingredients || []);
  const cookingSteps = restoration.steps || restoration.cookingSteps || [];
  const confidence = Math.round((restoration.match_confidence || 0.85) * 100);
  const dishId = inferDishId(restoration, dishes);
  const evidencePayload = buildEvidencePayload(restoration, {
    ingredients,
    cookingSteps,
    techniques: restoration.techniques || [],
  });

  return {
    id: dishId,
    name: restoration.dish_name || restoration.name || '未知菜品',
    dynasty: restoration.dynasty || '未知朝代',
    source: restoration.source || '未知出处',
    description: restoration.description || '',
    originalRecipe: restoration.original_text || restoration.originalRecipe || clue,
    modernRecipe: restoration.modern_adaptation || restoration.modernRecipe || '',
    confidence,
    ingredients,
    cookingSteps,
    historicalContext: restoration.cultural_notes || restoration.historicalContext || '',
    culturalSignificance: restoration.cultural_notes || restoration.culturalSignificance || '',
    difficulty: restoration.difficulty || '未知',
    cookingTime: restoration.cooking_time || restoration.cookingTime || '未知',
    tasteProfile: restoration.taste_profile || restoration.tasteProfile || '',
    techniques: restoration.techniques || [],
    evidenceScore: evidencePayload.evidenceScore,
    evidenceBreakdown: evidencePayload.evidenceBreakdown,
  };
}

function buildReasoningSteps(dish, clue) {
  const originalIngredients = dish.ingredients?.original || [];
  const techniques = dish.techniques || [];

  return [
    {
      type: 'step',
      step: 1,
      title: '解析线索',
      detail: `从输入中识别到「${dish.name}」相关线索，出处指向${dish.source}。`,
      status: 'done',
    },
    {
      type: 'step',
      step: 2,
      title: '食材考证',
      detail: originalIngredients.length > 0
        ? `比对知识图谱中的食材：${originalIngredients.slice(0, 4).join('、')}。`
        : `未直接抽取到完整食材，保留原始线索继续推理：${clue.slice(0, 40)}。`,
      status: 'done',
    },
    {
      type: 'step',
      step: 3,
      title: '技法推演',
      detail: techniques.length > 0
        ? `将古法技艺转译为现代可操作步骤：${techniques.join('、')}。`
        : `根据菜品档案生成现代厨房可执行步骤，共 ${dish.cookingSteps.length} 步。`,
      status: 'done',
    },
    {
      type: 'step',
      step: 4,
      title: '整菜重建',
      detail: `${dish.name} · ${dish.dynasty}复原版本，综合置信度${dish.confidence}%。`,
      status: 'done',
    },
  ];
}

function buildInsufficientDish(clue, analysis = {}) {
  const reasoningSteps = [
    {
      type: 'step',
      step: 1,
      title: '解析线索',
      detail: `已读取线索，但未识别到足够稳定的菜名、食材或技法证据：${clue.slice(0, 48)}。`,
      status: 'done',
    },
    {
      type: 'step',
      step: 2,
      title: '证据不足',
      detail: '系统不会为了演示效果默认返回第一道菜。请补充古籍出处、食材、技法、朝代或地域。',
      status: 'blocked',
    },
  ];
  const evidencePayload = buildInsufficientEvidencePayload(
    analysis.fallbackReason || 'Unable to match reliable dish evidence from the provided clue.'
  );

  return {
    id: 'insufficient-evidence',
    name: '证据不足',
    dynasty: '未知',
    source: '待补充',
    description: '当前线索不足以支撑可信复原。系统已停止生成确定菜品，避免把弱证据包装成结论。',
    originalRecipe: clue,
    modernRecipe: '',
    confidence: 0,
    ingredients: { original: [], modern: [] },
    cookingSteps: [],
    historicalContext: '',
    culturalSignificance: '',
    difficulty: '未知',
    cookingTime: '未知',
    tasteProfile: '',
    techniques: [],
    reasoningSteps,
    evidenceStatus: 'insufficient',
    needsMoreClues: true,
    fallbackReason: '未能从线索中匹配到可信菜品，已返回不确定结果。',
    evidenceScore: evidencePayload.evidenceScore,
    evidenceBreakdown: evidencePayload.evidenceBreakdown,
    suggestions: analysis.suggestions || [],
  };
}

async function buildAnalysisStreamResult(clue) {
  const [analysis, dishList] = await Promise.all([
    PythonBridge.analyze(clue),
    PythonBridge.listDishes(),
  ]);
  const dishes = dishList.dishes || [];
  let restoration = analysis.restorations?.[0];

  const topSuggestion = analysis.suggestions?.[0];
  if (!restoration && topSuggestion?.dish_id && (topSuggestion.match_score || 0) >= 0.45) {
    restoration = await PythonBridge.restore(topSuggestion.dish_id);
  }

  if (!restoration) {
    const dish = buildInsufficientDish(clue, analysis);
    return {
      analysis,
      reasoningSteps: dish.reasoningSteps,
      dish,
    };
  }

  const dish = formatRestoredDish(restoration, clue, dishes);
  const reasoningSteps = buildReasoningSteps(dish, clue);
  const shareCard = await LightModeService.createShareCard({
    dishId: dish.id,
    type: 'revival',
    signature: '首席风味考古官',
  });

  return {
    analysis,
    reasoningSteps,
    dish: {
      ...dish,
      reasoningSteps,
      shareCard,
    },
  };
}

router.get('/analyze-stream', async (req, res) => {
  const { clue } = req.query;
  if (!clue) return res.status(400).json({ error: '缺少线索参数' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    const streamResult = await buildAnalysisStreamResult(clue);

    streamResult.reasoningSteps.forEach((step) => {
      res.write(`data: ${JSON.stringify(step)}\n\n`);
    });

    res.write(`data: ${JSON.stringify({
      type: 'result',
      dish: streamResult.dish,
      analysis: streamResult.analysis,
    })}\n\n`);
  } catch (error) {
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: error.message || '考据链生成失败',
    })}\n\n`);
  } finally {
    res.end();
  }
});

router.get('/generate-image', async (req, res) => {
  try {
    const startedAt = Date.now();
    const { prompt } = req.query;
    const dishName = resolveImageDishName(req.query.dishName, prompt, req, req.query.dishId);
    const agnesImageService = new AgnesImageService();
    const fallbackPrompt = DishVisualPromptService.buildPrompt({ dishName, prompt });
    let fallbackReason = agnesImageService.isConfigured()
      ? ''
      : 'AGNES_API_KEY is not configured; local image pipeline used.';

    if (agnesImageService.isConfigured()) {
      try {
        const image = await agnesImageService.generate({ dishName, prompt });
        res.json({ success: true, data: image });
        return;
      } catch (error) {
        fallbackReason = `Agnes image generation failed: ${error.message}`;
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Agnes image generation failed, falling back to local pipeline:', error.message);
        }
      }
    }

    const inputJson = JSON.stringify({ dish_name: dishName, prompt_detail: prompt || dishName });

    execFile(PYTHON_BIN(), [PYTHON_SCRIPT, 'generate_image', inputJson],
      { encoding: 'utf8', timeout: 30000 },
      (error, stdout) => {
        if (error) {
          res.json({
            success: true,
            data: buildDegradedImagePayload({
              dishName,
              fallbackPrompt,
              fallbackReason: fallbackReason || `Local image pipeline failed: ${error.message}`,
              configured: agnesImageService.isConfigured(),
              startedAt,
            }),
          });
          return;
        }

        try {
          const result = JSON.parse(stdout);
          res.json({ success: true, data: attachLocalImageMetadata(result, startedAt) });
        } catch {
          res.json({
            success: true,
            data: buildDegradedImagePayload({
              dishName,
              fallbackPrompt,
              fallbackReason: fallbackReason || 'Local image pipeline returned invalid JSON.',
              configured: agnesImageService.isConfigured(),
              startedAt,
            }),
          });
        }
      });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/generate-image', async (req, res) => {
  try {
    const startedAt = Date.now();
    const { dishName: rawDishName, dishId, prompt } = req.body || {};
    const dishName = resolveImageDishName(rawDishName, prompt, req, dishId);
    const agnesImageService = new AgnesImageService();
    const fallbackPrompt = DishVisualPromptService.buildPrompt({ dishName, prompt });
    let fallbackReason = agnesImageService.isConfigured()
      ? ''
      : 'AGNES_API_KEY is not configured; local image pipeline used.';

    if (agnesImageService.isConfigured()) {
      try {
        const image = await agnesImageService.generate({ dishName, prompt });
        res.json({ success: true, data: image });
        return;
      } catch (error) {
        fallbackReason = `Agnes image generation failed: ${error.message}`;
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Agnes image generation failed, falling back to local pipeline:', error.message);
        }
      }
    }

    const inputJson = JSON.stringify({ dish_name: dishName, prompt_detail: prompt || dishName });

    execFile(PYTHON_BIN(), [PYTHON_SCRIPT, 'generate_image', inputJson],
      { encoding: 'utf8', timeout: 30000 },
      (error, stdout) => {
        if (error) {
          res.json({
            success: true,
            data: buildDegradedImagePayload({
              dishName,
              fallbackPrompt,
              fallbackReason: fallbackReason || `Local image pipeline failed: ${error.message}`,
              configured: agnesImageService.isConfigured(),
              startedAt,
            }),
          });
          return;
        }

        try {
          const result = JSON.parse(stdout);
          res.json({ success: true, data: attachLocalImageMetadata(result, startedAt) });
        } catch {
          res.json({
            success: true,
            data: buildDegradedImagePayload({
              dishName,
              fallbackPrompt,
              fallbackReason: fallbackReason || 'Local image pipeline returned invalid JSON.',
              configured: agnesImageService.isConfigured(),
              startedAt,
            }),
          });
        }
      });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
