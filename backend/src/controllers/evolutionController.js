const EvolutionService = require('../services/EvolutionService');

/**
 * 风味进化 - 融合两个菜品生成新概念
 */
const evolve = async (req, res) => {
  try {
    const { dishId1, dishId2 } = req.body;

    if (!dishId1 || !dishId2) {
      return res.status(400).json({
        success: false,
        message: '需要提供两个菜品ID: dishId1 和 dishId2'
      });
    }

    const result = await EvolutionService.evolve({
      dishId1,
      dishId2,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: '风味进化完成',
      data: result
    });
  } catch (error) {
    console.error('风味进化错误:', error);
    res.status(500).json({
      success: false,
      message: '进化分析失败，请稍后重试'
    });
  }
};

module.exports = {
  evolve
};
