const PythonBridge = require('./PythonBridge');

/**
 * 教学服务 - 调用Python引擎提供数字传承人对话式教学
 */
class TeachingService {
  /**
   * 教学对话
   */
  static async teach({ dishId, message, sessionId, userId }) {
    // 调用Python引擎获取回答
    const result = await PythonBridge.teach(dishId, message);

    return {
      sessionId: sessionId || `session_${Date.now()}`,
      dishId,
      dishName: result.dish_name || '未知菜品',
      response: result.answer || '抱歉，我暂时无法回答这个问题。',
      suggestions: result.suggestions || [
        '这道菜的历史是什么？',
        '怎么制作这道菜？',
        '需要哪些食材？',
        '有什么文化意义？'
      ],
      tips: result.tips || [],
      historicalFact: result.historical_fact || ''
    };
  }

  /**
   * 获取教学历史
   */
  static async getHistory(userId, dishId) {
    return [];
  }
}

module.exports = TeachingService;
