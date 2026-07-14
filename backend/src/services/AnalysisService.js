const PythonBridge = require('./PythonBridge');

/**
 * 分析服务 - 调用Python复原引擎分析古籍/古画/口述线索
 */
class AnalysisService {
  /**
   * 分析输入内容
   */
  static async analyze({ inputType, content, imageUrl, userId }) {
    // 调用Python复原引擎进行分析
    const pythonResult = await PythonBridge.analyze(content);

    // 整理分析结果
    const clues = pythonResult.clues || {};
    const restorations = pythonResult.restorations || [];
    const suggestions = pythonResult.suggestions || [];

    // 构建前端需要的possibleDishes格式
    const possibleDishes = (clues.matched_dishes || []).map(match => ({
      id: match.id,
      name: match.name,
      confidence: match.confidence,
      matchedKeyword: match.matched_keyword
    }));

    // 构建食材列表
    const ingredients = (clues.matched_ingredients || []).map(ing => ({
      id: ing.id,
      name: ing.name,
      matchedKeyword: ing.matched_keyword
    }));

    // 构建技法列表
    const cookingMethods = (clues.matched_techniques || []).map(tech => ({
      id: tech.id,
      name: tech.name
    }));

    // 构建朝代信息
    const dynasties = (clues.matched_dynasties || []).map(d => ({
      id: d.id,
      name: d.name
    }));

    // 构建地域信息
    const regions = (clues.matched_regions || []).map(r => ({
      id: r.id,
      name: r.name
    }));

    // 生成历史背景描述
    let historicalContext = '';
    if (dynasties.length > 0) {
      historicalContext = `根据文献记载，涉及${dynasties.map(d => d.name).join('、')}时期的饮食文化。`;
    }
    if (regions.length > 0) {
      historicalContext += `地域特征：${regions.map(r => r.name).join('、')}。`;
    }
    if (!historicalContext) {
      historicalContext = '根据古籍记载分析线索，尝试还原历史美味。';
    }

    // 计算总体置信度
    const confidence = possibleDishes.length > 0
      ? Math.max(...possibleDishes.map(d => d.confidence))
      : 0.3;

    return {
      inputType,
      content,
      confidence,
      extractedClues: clues.keywords || [],
      historicalContext,
      possibleDishes,
      ingredients,
      cookingMethods,
      dynasties,
      regions,
      restorations,
      suggestions,
      rawClues: clues
    };
  }

  /**
   * 获取用户分析历史
   */
  static async getUserHistory(userId, page = 1, limit = 10) {
    // 由于当前未连接数据库，返回空记录
    return [];
  }
}

module.exports = AnalysisService;
