const path = require('path');

const dishes = require(path.join(__dirname, '../../../data/knowledge_graph/nodes_dish.json'));
const OpenAIVisionProvider = require('./vision/OpenAIVisionProvider');
const VisionCandidateMapper = require('./vision/VisionCandidateMapper');
const AiRunMetadata = require('./AiRunMetadata');

const cueRules = [
  {
    dishId: 'dish_001',
    labels: ['crab', 'orange', 'steamed dish'],
    ingredients: ['crab', 'orange'],
    keywords: ['crab', 'orange', 'steamed', '蟹', '橙', '蒸'],
    confidence: 0.92,
  },
  {
    dishId: 'dish_002',
    labels: ['cold noodles', 'leaf', 'green noodles'],
    ingredients: ['noodles', 'sophora leaf'],
    keywords: ['noodle', 'cold noodle', 'leaf', '槐叶', '冷淘', '面'],
    confidence: 0.82,
  },
  {
    dishId: 'dish_003',
    labels: ['radish', 'rice porridge', 'soup'],
    ingredients: ['radish', 'rice'],
    keywords: ['radish', 'rice', 'porridge', '萝卜', '米', '羹'],
    confidence: 0.78,
  },
  {
    dishId: 'dish_004',
    labels: ['tofu', 'mushroom', 'braised dish'],
    ingredients: ['tofu', 'mushroom'],
    keywords: ['tofu', 'mushroom', '豆腐', '蘑菇', '菇'],
    confidence: 0.76,
  },
  {
    dishId: 'dish_006',
    labels: ['roasted meat', 'lamb', 'skewer'],
    ingredients: ['lamb', 'meat'],
    keywords: ['lamb', 'roast', 'meat', '羊', '烤肉', '肉'],
    confidence: 0.74,
  },
];

function normalize(value = '') {
  return String(value).toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function withExtraEvidence(evidence, extraEvidence = []) {
  return [...extraEvidence.filter(Boolean), ...evidence];
}

function buildFallback({
  imageData = '',
  imageLabel = '',
  description = '',
  extraEvidence = [],
  fallbackReason = 'External VLM is not configured; local vision rules used.',
  startedAt = Date.now(),
} = {}) {
  const clue = normalize(`${imageLabel} ${description}`);
  const hasImagePayload = Boolean(imageData && String(imageData).startsWith('data:image/'));
  const metadata = AiRunMetadata.degraded({
    provider: 'local-vision-rules',
    model: 'keyword-cue-rules',
    startedAt,
    fallbackReason,
    configured: false,
  });

  if (!clue.trim() && !hasImagePayload) {
    return {
      provider: 'fallback',
      labels: [],
      ingredients: [],
      dishCandidates: [],
      confidence: 0.2,
      evidence: withExtraEvidence(['No usable visual or text clues were provided.'], extraEvidence),
      metadata,
    };
  }

  const matches = cueRules
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((keyword) => clue.includes(normalize(keyword)));
      if (matchedKeywords.length === 0) return null;
      const dish = dishes.find((item) => item.id === rule.dishId);
      const confidence = Math.min(0.98, rule.confidence + matchedKeywords.length * 0.02 + (hasImagePayload ? 0.02 : 0));
      return {
        rule,
        matchedKeywords,
        candidate: {
          dishId: rule.dishId,
          name: dish?.name || rule.dishId,
          confidence,
          reason: `Matched visual/text cues: ${matchedKeywords.join(', ')}.`,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.candidate.confidence - a.candidate.confidence);

  if (matches.length === 0) {
    return {
      provider: 'fallback',
      labels: hasImagePayload ? ['food image'] : [],
      ingredients: [],
      dishCandidates: [],
      confidence: hasImagePayload ? 0.35 : 0.25,
      evidence: withExtraEvidence(
        hasImagePayload
          ? ['Image payload was provided, but fallback rules found no confident food ancestry match.']
          : ['Text was provided, but fallback rules found no confident food ancestry match.'],
        extraEvidence
      ),
      metadata,
    };
  }

  return {
    provider: 'fallback',
    labels: unique(matches.flatMap((match) => match.rule.labels)),
    ingredients: unique(matches.flatMap((match) => match.rule.ingredients)),
    dishCandidates: matches.map((match) => match.candidate),
    confidence: matches[0].candidate.confidence,
    evidence: withExtraEvidence(
      matches.flatMap((match) => match.matchedKeywords.map((keyword) => `Matched cue: ${keyword}`)),
      extraEvidence
    ),
    metadata,
  };
}

function isConfiguredProvider(provider) {
  return Boolean(provider && typeof provider.isConfigured === 'function' && provider.isConfigured());
}

function isValidExternalResult(external) {
  return (
    external !== null &&
    typeof external === 'object' &&
    !Array.isArray(external) &&
    typeof external.provider === 'string' &&
    Array.isArray(external.labels) &&
    Array.isArray(external.ingredients) &&
    Array.isArray(external.dishCandidates) &&
    Number.isFinite(external.confidence) &&
    Array.isArray(external.evidence)
  );
}

class VisionService {
  static async analyzeFoodImage({
    imageData = '',
    imageLabel = '',
    description = '',
    provider = new OpenAIVisionProvider(),
  } = {}) {
    const startedAt = Date.now();
    if (isConfiguredProvider(provider)) {
      let external;

      try {
        external = await provider.analyze({ imageData, imageLabel, description });
      } catch (error) {
        return buildFallback({
          imageData,
          imageLabel,
          description,
          extraEvidence: [`External VLM unavailable; fallback used. ${error.message}`],
          fallbackReason: `External VLM unavailable: ${error.message}`,
          startedAt,
        });
      }

      if (!isValidExternalResult(external)) {
        return buildFallback({
          imageData,
          imageLabel,
          description,
          extraEvidence: ['External VLM unavailable; fallback used. External VLM result shape was invalid.'],
          fallbackReason: 'External VLM result shape was invalid.',
          startedAt,
        });
      }

      const mappedCandidates = VisionCandidateMapper.mapCandidates(external.dishCandidates);
      const evidence = [...external.evidence];

      if (mappedCandidates.length < external.dishCandidates.length) {
        evidence.push('External VLM candidates were not found in the local dish graph.');
      }

      return {
        ...external,
        dishCandidates: mappedCandidates,
        evidence,
        metadata: external.metadata || AiRunMetadata.generated({
          provider: external.provider,
          model: external.model || 'vision-model',
          startedAt,
        }),
      };
    }

    return buildFallback({ imageData, imageLabel, description, startedAt });
  }
}

module.exports = VisionService;
