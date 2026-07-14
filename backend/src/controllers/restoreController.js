const RestorationService = require('../services/RestorationService');

/**
 * 复原菜品
 */
const restore = async (req, res) => {
  try {
    const { analysisId, clues, preferences } = req.body;

    // 验证输入
    if (!analysisId && !clues) {
      return res.status(400).json({
        success: false,
        message: '请提供分析ID或线索信息'
      });
    }

    // 调用复原服务
    const result = await RestorationService.restore({
      analysisId,
      clues,
      preferences,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: '菜品复原完成',
      data: result
    });
  } catch (error) {
    console.error('复原错误:', error);
    res.status(500).json({
      success: false,
      message: '复原过程中出现错误'
    });
  }
};

/**
 * 获取复原历史
 */
const getHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 10 } = req.query;

    const records = await RestorationService.getUserHistory(userId, page, limit);

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    console.error('获取复原历史错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
};

module.exports = {
  restore,
  getHistory
};
