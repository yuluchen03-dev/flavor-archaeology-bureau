const PythonBridge = require('./PythonBridge');
const AiRunAuditService = require('./AiRunAuditService');

/**
 * 复原服务 - 调用Python复原引擎复原古菜
 */
class RestorationService {
  static buildInsufficientEvidenceResult(fallbackReason, suggestions = []) {
    return {
      dishName: '证据不足',
      name: '证据不足',
      description: '当前线索不足以支撑可信复原。请补充古籍原文、食材、技法、朝代、地域或出处。',
      ingredients: { original: [], modern: [] },
      steps: [],
      cookingSteps: [],
      suggestions,
      evidenceStatus: 'insufficient',
      fallbackReason,
      needsMoreClues: true,
      confidence: 0,
      evidenceScore: 0,
      evidenceBreakdown: this.buildInsufficientEvidenceBreakdown(fallbackReason),
    };
  }

  static clampScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(0, Math.min(100, Math.round(number)));
  }

  static buildInsufficientEvidenceBreakdown(reason = '') {
    return {
      clueMatch: 0,
      sourceMatch: 0,
      ingredientMatch: 0,
      techniqueMatch: 0,
      overallReason: reason || 'Insufficient evidence to produce a reliable restoration.',
    };
  }

  static normalizeEvidenceBreakdown(breakdown, fallback) {
    if (!breakdown || typeof breakdown !== 'object') return fallback;
    return {
      clueMatch: this.clampScore(breakdown.clueMatch ?? breakdown.clue_match ?? fallback.clueMatch),
      sourceMatch: this.clampScore(breakdown.sourceMatch ?? breakdown.source_match ?? fallback.sourceMatch),
      ingredientMatch: this.clampScore(breakdown.ingredientMatch ?? breakdown.ingredient_match ?? fallback.ingredientMatch),
      techniqueMatch: this.clampScore(breakdown.techniqueMatch ?? breakdown.technique_match ?? fallback.techniqueMatch),
      overallReason: breakdown.overallReason || breakdown.overall_reason || fallback.overallReason,
    };
  }

  static calculateEvidenceScore(breakdown) {
    return this.clampScore(
      breakdown.clueMatch * 0.3
      + breakdown.sourceMatch * 0.3
      + breakdown.ingredientMatch * 0.2
      + breakdown.techniqueMatch * 0.2
    );
  }

  static buildEvidencePayload(result = {}, status = 'sufficient') {
    if (status === 'insufficient') {
      return {
        evidenceScore: 0,
        evidenceBreakdown: this.buildInsufficientEvidenceBreakdown(result.fallbackReason || result.fallback_reason),
      };
    }

    const citations = Array.isArray(result.citations) ? result.citations : [];
    const ingredients = Array.isArray(result.ingredients) ? result.ingredients : [];
    const techniques = Array.isArray(result.techniques) ? result.techniques : [];
    const steps = Array.isArray(result.steps) ? result.steps : [];
    const matchConfidence = Number(result.match_confidence ?? result.matchConfidence);
    const fallback = {
      clueMatch: Number.isFinite(matchConfidence)
        ? this.clampScore(matchConfidence * 100)
        : this.clampScore(result.dish_id || result.dishId || result.id || result.dish_name ? 85 : 0),
      sourceMatch: citations.length > 0
        ? 100
        : this.clampScore(result.source_url || result.sourceUrl || result.source || result.original_text ? 75 : 0),
      ingredientMatch: this.clampScore(ingredients.length > 0 ? 80 : 0),
      techniqueMatch: this.clampScore((techniques.length > 0 || steps.length > 0) ? 80 : 0),
      overallReason: 'Evidence combines matched clues, source citations, ingredients, and cooking techniques.',
    };
    const evidenceBreakdown = this.normalizeEvidenceBreakdown(
      result.evidenceBreakdown || result.evidence_breakdown,
      fallback
    );
    const existingScore = result.evidenceScore ?? result.evidence_score;

    return {
      evidenceScore: existingScore === undefined || existingScore === null
        ? this.calculateEvidenceScore(evidenceBreakdown)
        : this.clampScore(existingScore),
      evidenceBreakdown,
    };
  }

  static extractCitationIds(citations = []) {
    if (!Array.isArray(citations)) return [];
    return citations
      .map((citation) => citation && (citation.id || citation.source_id || citation.sourceId || citation.title))
      .filter(Boolean)
      .map(String);
  }

  static shouldSkipAudit(auditOptions) {
    return process.env.NODE_ENV === 'test' && !auditOptions;
  }

  static async withAudit(result, { input, auditOptions, startedAt = Date.now() } = {}) {
    if (this.shouldSkipAudit(auditOptions)) return result;

    try {
      const ai = result.ai || result.ai_metadata || {};
      const record = AiRunAuditService.buildAuditRecord({
        input,
        output: result,
        provider: ai.provider || 'local-python',
        model: ai.model || 'knowledge-graph-rules',
        mode: result.evidenceStatus === 'insufficient' ? 'insufficient' : (ai.mode || 'local'),
        fallbackReason: result.fallbackReason || ai.fallbackReason || null,
        promptVersion: process.env.RESTORATION_PROMPT_VERSION || 'restoration-v1',
        dataVersion: process.env.RESTORATION_DATA_VERSION || 'local-knowledge-graph',
        citationIds: this.extractCitationIds(result.citations),
        latencyMs: ai.latencyMs ?? Date.now() - startedAt,
      });
      await AiRunAuditService.appendAuditRecord(record, auditOptions || {});
      return result;
    } catch (error) {
      return {
        ...result,
        auditError: error.message || String(error),
      };
    }
  }

  /**
   * 复原菜品
   */
  static async restore({ analysisId, clues, preferences, userId, auditOptions } = {}) {
    const startedAt = Date.now();
    const auditInput = { analysisId, clues, preferences, userId };

    // 如果提供了菜品ID，直接复原该菜品
    if (clues && clues.dishId) {
      const result = await PythonBridge.restore(clues.dishId);
      return this.withAudit(this.formatRestorationResult(result), {
        input: auditInput,
        auditOptions,
        startedAt,
      });
    }

    // 如果提供了分析文本，先分析再复原
    if (clues && clues.text) {
      const analysisResult = await PythonBridge.analyze(clues.text);
      if (analysisResult.restorations && analysisResult.restorations.length > 0) {
        return this.withAudit(this.formatRestorationResult(analysisResult.restorations[0]), {
          input: auditInput,
          auditOptions,
          startedAt,
        });
      }
      const insufficientResult = this.buildInsufficientEvidenceResult(
        '未能从输入内容中匹配到已知的历史菜品，请尝试提供更多线索。',
        analysisResult.suggestions || []
      );
      return this.withAudit(insufficientResult, {
        input: auditInput,
        auditOptions,
        startedAt,
      });
    }

    // 如果有possibleDishes，尝试复原第一个
    if (clues && clues.possibleDishes && clues.possibleDishes.length > 0) {
      const dishId = clues.possibleDishes[0].id;
      const result = await PythonBridge.restore(dishId);
      return this.withAudit(this.formatRestorationResult(result), {
        input: auditInput,
        auditOptions,
        startedAt,
      });
    }

    const insufficientResult = this.buildInsufficientEvidenceResult('没有收到可复原的线索，系统不会默认返回示例菜。');
    return this.withAudit(insufficientResult, {
      input: auditInput,
      auditOptions,
      startedAt,
    });
  }

  /**
   * 格式化复原结果为前端需要的格式
   */
  static formatRestorationResult(result) {
    if (result.error) {
      return {
        dishName: '复原失败',
        description: result.error,
        ingredients: [],
        steps: []
      };
    }

    // 构建食材列表
    const ingredients = {
      original: (result.ingredients || []).map(ing => ing.name || ing),
      modern: (result.ingredients || []).map(ing => {
        if (ing.substitutes && ing.substitutes.length > 0) {
          return ing.substitutes[0].name;
        }
        return ing.name || ing;
      })
    };

    // 构建步骤列表
    const steps = (result.steps || []).map((step, index) => {
      if (typeof step === 'string') return step;
      return step.description || step.name || `步骤${index + 1}`;
    });
    const evidenceStatus = result.evidence_status || result.evidenceStatus || 'sufficient';
    const evidencePayload = this.buildEvidencePayload(result, evidenceStatus);

    return {
      id: result.dish_id || result.dishId || result.id || result.dish_name || '',
      name: result.dish_name || '未知菜品',
      dynasty: result.dynasty || '未知朝代',
      source: result.source || '未知来源',
      sourceUrl: result.source_url || result.sourceUrl || '',
      description: result.description || '',
      originalRecipe: result.original_text || '',
      modernRecipe: result.modern_adaptation || '',
      ingredients,
      cookingSteps: steps.length > 0 ? steps : [
        '第一步：准备食材，按古代文献记载的比例备料',
        '第二步：预处理食材，遵循古法清洗和切割',
        '第三步：按照古代烹饪技法进行烹制',
        '第四步：调味出锅，还原古代风味'
      ],
      historicalContext: result.cultural_notes || `${result.dish_name || '此菜'}是中华饮食文化的重要组成部分。`,
      culturalSignificance: result.cultural_notes || `${result.dish_name || '此菜'}承载着深厚的饮食文化底蕴。`,
      difficulty: result.difficulty || '未知',
      cookingTime: result.cooking_time || '未知',
      tasteProfile: result.taste_profile || '',
      regions: result.regions || [],
      seasons: result.seasons || [],
      techniques: result.techniques || [],
      citations: result.citations || [],
      verificationNote: result.verification_note || result.verificationNote || '',
      licenseNote: result.license_note || result.licenseNote || '',
      copyrightNote: result.copyright_note || result.copyrightNote || '',
      expertReviewed: Boolean(result.expertReviewed),
      evidenceStatus,
      evidenceScore: evidencePayload.evidenceScore,
      evidenceBreakdown: evidencePayload.evidenceBreakdown,
      ai: result.ai_metadata || result.ai || null,
    };
  }

  /**
   * 获取用户复原历史
   */
  static async getUserHistory(userId, page = 1, limit = 10) {
    return [];
  }
}

module.exports = RestorationService;
